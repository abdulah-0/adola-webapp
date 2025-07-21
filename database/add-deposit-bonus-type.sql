-- Add deposit_bonus transaction type to wallet_transactions table
-- This allows the system to track 5% deposit bonuses separately

-- Drop the existing constraint
ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;

-- Add the new constraint with deposit_bonus included
ALTER TABLE wallet_transactions ADD CONSTRAINT wallet_transactions_type_check 
CHECK (type IN ('deposit', 'withdraw', 'game_win', 'game_loss', 'referral_bonus', 'welcome_bonus', 'deposit_bonus'));

-- Update the comment to reflect the new transaction type
COMMENT ON COLUMN wallet_transactions.type IS 'Transaction type: deposit, withdraw, game_win, game_loss, referral_bonus, welcome_bonus, deposit_bonus';

-- Create an index for faster queries on deposit_bonus transactions
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_deposit_bonus 
ON wallet_transactions(user_id, type) 
WHERE type = 'deposit_bonus';

-- Add a comment explaining the deposit bonus system
COMMENT ON TABLE wallet_transactions IS 'All wallet transactions including automatic 5% deposit bonuses. Every approved deposit automatically generates a deposit_bonus transaction for 5% of the deposit amount.';
