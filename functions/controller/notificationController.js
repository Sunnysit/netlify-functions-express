import { Expo } from 'expo-server-sdk';

// Create a new Expo SDK client
let expo = new Expo();

export const sendNotifications = async (pushTokens, payload) => {
  // Create the messages that you want to send to clients
  let messages = [];
  for (let pushToken of pushTokens) {
    // Each push token looks like ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]

    // Check that all your push tokens appear to be valid Expo push tokens
    if (!Expo.isExpoPushToken(pushToken)) {
      console.error(`Push token ${pushToken} is not a valid Expo push token`);
      continue;
    }

    // Construct a message (see https://docs.expo.io/push-notifications/sending-notifications/)
    messages.push({
      to: pushToken,
      title: payload.title,
      body: payload.body,
      data: payload.data,
    });
  }

  let chunks = expo.chunkPushNotifications(messages);
  let tickets = [];

  // Send the chunks to the Expo push notification service. There are
  // different strategies you could use. A simple one is to send one chunk at a
  // time, which nicely spreads the load out over time:
  for (let chunk of chunks) {
    try {
      let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
      // NOTE: If a ticket contains an error code in ticket.details.error, you
      // must handle it appropriately. The error codes are listed in the Expo
      // documentation:
      // https://docs.expo.io/push-notifications/sending-notifications/#individual-errors
      return tickets;
    } catch (error) {
      console.error(error);
      return 'unable to connect to expo server';
    }
  }
};

export const checkReceipts = async (receiptIds) => {
  let receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);
  let result = [];
  for (let chunk of receiptIdChunks) {
    try {
      let receipts = await expo.getPushNotificationReceiptsAsync(chunk);

      // The receipts specify whether Apple or Google successfully received the
      // notification and information about an error, if one occurred.
      for (let receiptId in receipts) {
        let { status, message, details } = receipts[receiptId];
        if (status === 'ok') {
          result.push({ id: receiptId, status: 'ok' });
        } else if (status === 'error') {
          console.error(
            `There was an error sending a notification: ${message}`
          );
          if (details && details.error) {
            // The error codes are listed in the Expo documentation:
            // https://docs.expo.io/push-notifications/sending-notifications/#individual-errors
            // You must handle the errors appropriately.
            console.error(`The error code is ${details.error}`);
            result.push({
              id: receiptId,
              status: 'error',
              detail: details.error,
            });
          }
          result.push({ id: receiptId, status: 'error', detail: message });
        }
      }
    } catch (error) {
      console.error(error);
    }
  }
  return result;
};
