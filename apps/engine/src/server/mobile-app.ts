// Mobile app info route
// GET /api/mobile-app  - app download info

import express, { Router, type Request, type Response } from 'express';

const MOBILE_APP_INFO = {
  ios: {
    url: 'https://apps.apple.com/app/chinque-crypto/idplaceholder',
    qr: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://apps.apple.com/app/chinque-crypto/idplaceholder',
  },
  android: {
    url: 'https://play.google.com/store/apps/details?id=com.chinque.crypto',
    qr: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://play.google.com/store/apps/details?id=com.chinque.crypto',
  },
  latestVersion: '1.0.0',
  releaseNotes: '首次发布，支持交易和钱包功能',
};

export function createMobileAppRouter(): Router {
  const router = Router();

  router.get('/api/mobile-app', (_req: Request, res: Response) => {
    res.json(MOBILE_APP_INFO);
  });

  return router;
}
