// Education routes — /api/education/*
// GET /api/education          - list all articles
// GET /api/education/:id      - get single article

import express, { Router, type Request, type Response } from 'express';

const EDUCATION_DATA = [
  {
    id: 'intro-trading',
    title: '加密货币交易入门指南',
    content: '学习如何开始您的加密货币交易之旅...',
    category: '入门',
  },
  {
    id: 'risk-management',
    title: '风险管理最佳实践',
    content: '了解如何在交易中保护自己的资金...',
    category: '策略',
  },
  {
    id: 'technical-analysis',
    title: '技术分析基础',
    content: '学习阅读图表和使用技术指标...',
    category: '技术',
  },
  {
    id: 'blockchain-basics',
    title: '区块链基础',
    content: '了解区块链技术和工作原理...',
    category: '入门',
  },
];

export function createEducationRouter(): Router {
  const router = Router();

  router.get('/api/education', (_req: Request, res: Response) => {
    res.json({ articles: EDUCATION_DATA });
  });

  router.get('/api/education/:id', (req: Request, res: Response) => {
    const article = EDUCATION_DATA.find(a => a.id === req.params.id);
    if (!article) return res.status(404).json({ error: 'Article not found' });
    res.json({ article });
  });

  return router;
}
