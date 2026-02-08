/**
 * 回復投稿作成用のバリデーションスキーマ（Zod）
 * フロント側の二重防御
 */

import { z } from 'zod'

export const recoveryStepSchema = z.object({
  order: z.number().int().min(1, 'ステップ順序は1以上である必要があります'),
  content: z.string().min(1, 'ステップ内容は必須です').max(5000, 'ステップ内容は5000文字以内です'),
  isFailure: z.boolean().default(false),
})

export const createRecoveryPostSchema = z.object({
  title: z.string().min(1, 'タイトルは必須です').max(200, 'タイトルは200文字以内です'),
  summary: z.string().min(1, '概要は必須です').max(5000, '概要は5000文字以内です'),
  problemCategory: z.enum(['debt', 'unemployed', 'dropout', 'addiction', 'relationship'], {
    errorMap: () => ({ message: '問題カテゴリが不正です' }),
  }),
  phaseAtPost: z.union([z.literal(1), z.literal(2), z.literal(3)], {
    errorMap: () => ({ message: 'フェーズレベルは1〜3である必要があります' }),
  }),
  startedAt: z.string().date().nullable().optional(),
  recoveredAt: z.string().date().nullable().optional(),
  currentStatus: z.string().min(1, '現在の状況は必須です').max(5000, '現在の状況は5000文字以内です'),
  
  steps: z.array(recoveryStepSchema).min(1, 'ステップは最低1つ必要です'),
  regionIds: z.array(z.number().int().positive()).default([]),
  tagNames: z.array(z.string().min(1)).default([]),
  status: z.enum(['draft', 'published']).optional(),
})
