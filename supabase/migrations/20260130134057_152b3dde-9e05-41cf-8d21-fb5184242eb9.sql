-- User profiles table for plan and preferences
CREATE TABLE public.user_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  monthly_optimizer_uses INTEGER NOT NULL DEFAULT 0,
  last_optimizer_reset TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT date_trunc('month', now()),
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Subscriptions table for Stripe status
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'canceled', 'past_due', 'trialing')),
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Optimizer requests table
CREATE TABLE public.optimizer_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  travel_window_start DATE NOT NULL,
  travel_window_end DATE,
  has_bags BOOLEAN DEFAULT false,
  priority TEXT NOT NULL DEFAULT 'cheapest' CHECK (priority IN ('cheapest', 'fastest', 'low_risk')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Optimizer results table
CREATE TABLE public.optimizer_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.optimizer_requests(id) ON DELETE CASCADE,
  recommended_route JSONB NOT NULL,
  estimated_total_cost NUMERIC NOT NULL,
  fare_estimate NUMERIC,
  baggage_estimate NUMERIC,
  transfer_estimate NUMERIC,
  extra_fees_estimate NUMERIC,
  timing_advice TEXT NOT NULL CHECK (timing_advice IN ('buy', 'wait', 'neutral')),
  timing_reason TEXT,
  risk_alerts JSONB DEFAULT '[]',
  affiliate_links JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.optimizer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.optimizer_results ENABLE ROW LEVEL SECURITY;

-- User profiles policies
CREATE POLICY "Users can view their own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Subscriptions policies
CREATE POLICY "Users can view their own subscription" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service can manage subscriptions" ON public.subscriptions
  FOR ALL USING (true) WITH CHECK (true);

-- Optimizer requests policies (allow anonymous for free tier preview)
CREATE POLICY "Users can view their own requests" ON public.optimizer_requests
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Anyone can create optimizer requests" ON public.optimizer_requests
  FOR INSERT WITH CHECK (true);

-- Optimizer results policies
CREATE POLICY "Users can view results for their requests" ON public.optimizer_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.optimizer_requests 
      WHERE id = request_id 
      AND (user_id = auth.uid() OR user_id IS NULL)
    )
  );

CREATE POLICY "Service can manage results" ON public.optimizer_results
  FOR ALL USING (true) WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer ON public.subscriptions(stripe_customer_id);
CREATE INDEX idx_optimizer_requests_user_id ON public.optimizer_requests(user_id);
CREATE INDEX idx_optimizer_results_request_id ON public.optimizer_results(request_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();