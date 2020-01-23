import * as admin from 'firebase-admin';
admin.initializeApp();

import * as cors from 'cors';
import * as express from 'express';
import * as bodyParser from 'body-parser';

import { https } from 'firebase-functions';
import { ApiScan } from './routes/scan';
import { ApiCall } from './api.call';
import { ApiInstall } from './routes/install';
import { ApiClaimPlayerStart, ApiClaimPlayerAccept } from './routes/claim';

const Api = express();
Api.use(cors({ maxAge: 24 * 60 * 60 }));
Api.use(bodyParser.json());

ApiCall.bind(Api, new ApiScan());
ApiCall.bind(Api, new ApiInstall());
ApiCall.bind(Api, new ApiClaimPlayerStart());
ApiCall.bind(Api, new ApiClaimPlayerAccept());

export const api = https.onRequest(Api);
