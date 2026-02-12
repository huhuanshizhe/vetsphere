
import { createClient } from '@supabase/supabase-js';

// Provided credentials
const SUPABASE_URL = 'https://tvxrgbntiksskywsroax.supabase.co';
const SUPABASE_KEY = 'sb_publishable_p9yrcBn_5vqpztf_Xf0cAQ_3ctbgRrA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
