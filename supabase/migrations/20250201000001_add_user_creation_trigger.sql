-- ============================================
-- auth.users作成時にpublic.usersレコードを自動作成するトリガー
-- 外部キー制約エラーを防ぐため
-- ============================================

-- 注意: Supabaseではauth.usersテーブルに直接トリガーを設定できない場合があるため、
-- このトリガーは参考用です。実際にはSignUpFormで手動作成する方法を使用します。

-- 関数: auth.usersのINSERT時にpublic.usersレコードを作成
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, phase_level)
  VALUES (NEW.id, 1)
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- トリガー: auth.usersのINSERT時に実行
-- 注意: Supabaseの制限により、authスキーマのテーブルに直接トリガーを設定できない場合があります
-- その場合は、SignUpFormで手動でpublic.usersレコードを作成してください
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user IS 'auth.users作成時にpublic.usersレコードを自動作成するトリガー関数';
