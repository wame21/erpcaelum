DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'clasificacion_gasto') THEN
    CREATE TYPE public.clasificacion_gasto AS ENUM ('mercancia','costo_directo','operativo','financiero');
  END IF;
END $$;

ALTER TABLE public.gastos
  ADD COLUMN IF NOT EXISTS clasificacion public.clasificacion_gasto NOT NULL DEFAULT 'operativo';

UPDATE public.gastos
SET clasificacion = CASE
  WHEN categoria IN ('empaque','materiales','transporte') THEN 'costo_directo'::public.clasificacion_gasto
  ELSE 'operativo'::public.clasificacion_gasto
END;

CREATE INDEX IF NOT EXISTS idx_gastos_clasificacion ON public.gastos(clasificacion, fecha DESC);