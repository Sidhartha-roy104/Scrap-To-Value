
-- Notify seller when a new listing is created
CREATE OR REPLACE FUNCTION public.notify_listing_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message)
  VALUES (
    NEW.user_id,
    'listing',
    'Listing Published',
    'Your listing "' || NEW.title || '" is now live on the marketplace.'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_listing_created
  AFTER INSERT ON public.waste_listings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_listing_created();

-- Notify buyer and seller when order status changes
CREATE OR REPLACE FUNCTION public.notify_order_status_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Notify buyer
    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (
      NEW.buyer_id,
      'deal',
      'Order ' || NEW.status,
      'Your order for ' || NEW.waste_type || ' (' || NEW.quantity || ' kg) has been updated to "' || NEW.status || '".'
    );
    -- Notify seller
    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (
      NEW.seller_id,
      'deal',
      'Order ' || NEW.status,
      'Order for ' || NEW.waste_type || ' (' || NEW.quantity || ' kg) has been updated to "' || NEW.status || '".'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_order_status_changed
  AFTER UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_order_status_changed();

-- Notify seller when a new order/payment is received
CREATE OR REPLACE FUNCTION public.notify_payment_received()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message)
  VALUES (
    NEW.seller_id,
    'deal',
    'Payment Received',
    'You received ₹' || NEW.amount || ' for ' || NEW.waste_type || ' (' || NEW.quantity || ' kg).'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_payment_received
  AFTER INSERT ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_payment_received();
