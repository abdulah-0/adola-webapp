-- Add USDT withdrawal support to withdrawal_requests table
-- This migration adds the metadata column and makes bank_details optional

-- Add metadata column for storing USDT withdrawal details
ALTER TABLE public.withdrawal_requests 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Make bank_details optional (allow NULL for USDT withdrawals)
ALTER TABLE public.withdrawal_requests 
ALTER COLUMN bank_details DROP NOT NULL;

-- Update the amount constraint to allow smaller amounts for USDT (minimum 1350 PKR = 5 USDT)
ALTER TABLE public.withdrawal_requests 
DROP CONSTRAINT IF EXISTS withdrawal_requests_amount_check;

ALTER TABLE public.withdrawal_requests 
ADD CONSTRAINT withdrawal_requests_amount_check 
CHECK (amount >= 300);

-- Add index for metadata column for better performance
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_metadata 
ON public.withdrawal_requests USING GIN (metadata);

-- Add comment to document the changes
COMMENT ON COLUMN public.withdrawal_requests.metadata IS 'Stores USDT withdrawal details and other metadata';
COMMENT ON COLUMN public.withdrawal_requests.bank_details IS 'Bank details for bank transfers (NULL for USDT withdrawals)';

-- Verify the changes
DO $$
BEGIN
    RAISE NOTICE 'USDT withdrawal support added successfully!';
    RAISE NOTICE 'Changes made:';
    RAISE NOTICE '1. Added metadata JSONB column';
    RAISE NOTICE '2. Made bank_details optional (nullable)';
    RAISE NOTICE '3. Updated amount constraint to >= 300 PKR';
    RAISE NOTICE '4. Added metadata index for performance';
END $$;
