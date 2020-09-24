/* Express App */
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import compression from 'compression';
import customLogger from '../utils/logger';

import {
  sendNotifications,
  checkReceipts,
} from '../controller/notificationController';

/* My express App */
export default function expressApp(functionName) {
  const app = express();
  const router = express.Router();

  // gzip responses
  router.use(compression());

  // Set router base path for local dev
  const routerBasePath =
    process.env.NODE_ENV === 'dev'
      ? `/${functionName}`
      : `/.netlify/functions/${functionName}/`;

  /* define routes */
  router.get('/', (req, res) => {
    const html = `
    <html>
      <head>
        <style>
          body {
            padding: 30px;
          }
        </style>
      </head>
      <body>
        <h1>Express via '${functionName}' ⊂◉‿◉つ</h1>

        <p>I'm using Express running via a <a href='https://www.netlify.com/docs/functions/' target='_blank'>Netlify Function</a>.</p>

        <p>Choose a route:</p>

        <div>
          <a href='/.netlify/functions/${functionName}/users'>View /users route</a>
        </div>

        <div>
          <a href='/.netlify/functions/${functionName}/hello'>View /hello route</a>
        </div>

        <br/>
        <br/>

        <div>
          <a href='/'>
            Go back to demo homepage
          </a>
        </div>

        <br/>
        <br/>

        <div>
          <a href='https://github.com/DavidWells/netlify-functions-express' target='_blank'>
            See the source code on github
          </a>
        </div>
      </body>
    </html>
  `;
    res.send(html);
  });

  // Attach logger
  app.use(morgan(customLogger));

  // Setup routes
  app.use(routerBasePath, router);

  // Apply express middlewares
  router.use(cors());
  router.use(express.json());
  router.use(express.urlencoded({ extended: true }));

  router.post('/send', (req, res) => {
    if (
      req.body.pushTokens &&
      req.body.title &&
      req.body.content &&
      req.body.data
    ) {
      (async () => {
        const result = await sendNotifications(req.body.pushTokens, {
          title: req.body.title,
          body: req.body.content,
          data: req.body.data,
        });
        res.status(200).send({ return_code: 200, data: result });
      })();
    } else {
      res
        .status(400)
        .json({ return_code: 400, data: JSON.stringify(req.body) });
    }
  });

  router.post('/check', (req, res) => {
    if (req.body.ids) {
      (async () => {
        const result = await checkReceipts(req.body.ids);
        res.status(200).send({ return_code: 200, data: result });
      })();
    } else {
      res
        .status(400)
        .json({ return_code: 400, data: 'Require correct params.' });
    }
  });

  router.get('*', (req, res) => {
    res.status(404).json({ return_code: 404, data: 'Not Found' });
  });

  router.post('*', (req, res) => {
    res.status(404).json({ return_code: 404, data: 'Not Found' });
  });

  return app;
}
