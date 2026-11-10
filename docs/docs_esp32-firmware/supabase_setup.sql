-- ============================================================================
-- PROYECTO: Control de Tanque Inteligente con Chatbot de IA
-- CURSO:    Arquitectura del Computador · UPN Trujillo
-- ARCHIVO:  docs/supabase_setup.sql
-- DESCRIPCION: Script DDL y DML para aprovisionamiento completo en Supabase
-- ============================================================================

-- 0. Limpieza previa de tablas obsoletas (si existen)
drop table if exists public.control_actuadores cascade;
drop table if exists public.lecturas_agua cascade;

-- ============================================================================
-- 1. TABLA DE HISTORIAL (Telemetria pura para series temporales y auditoria)
-- ============================================================================
create table if not exists public.historial_tanque (
    id bigint generated always as identity primary key,
    created_at timestamptz default now() not null,
    
    -- Variables fisicas clave
    distancia_cm numeric(5,2) not null,
    altura_agua_cm numeric(5,2) not null,
    litros_disponibles numeric(6,2) not null,
    porcentaje_nivel numeric(4,1) not null,
    turbidez_ntu numeric(6,2) not null,
    tapa_abierta boolean not null,
    
    -- Consumo y proyeccion
    tasa_consumo_l_h numeric(6,2) not null,
    dias_autonomia numeric(5,2) not null,
    horas_almacenada numeric(6,2) not null,
    
    -- Banderas de alertas fijas deterministas
    alerta_nivel_bajo boolean not null,
    alerta_tapa_abierta boolean not null,
    alerta_turbidez_alta boolean not null,
    alerta_fuga boolean not null,
    alerta_estancada boolean not null
);

-- Indice para consultas rapidas ordenadas por tiempo descendente
create index if not exists idx_historial_created_at on public.historial_tanque (created_at desc);

-- ============================================================================
-- 2. TABLA DE ESTADO ACTUAL (Fila unica id = 1 para App Web y Chatbot)
-- ============================================================================
create table if not exists public.estado_tanque (
    id int primary key check (id = 1),
    updated_at timestamptz default now() not null,
    modo_prototipo boolean not null default true,
    uptime_seg bigint not null default 0,
    
    -- Mediciones instantaneas
    distancia_cm numeric(5,2) not null,
    altura_agua_cm numeric(5,2) not null,
    litros_disponibles numeric(6,2) not null,
    porcentaje_nivel numeric(4,1) not null,
    turbidez_ntu numeric(6,2) not null,
    turbidez_referencia_ntu numeric(6,2) not null,
    tapa_abierta boolean not null,
    segundos_tapa_abierta bigint not null default 0,
    
    -- Autonomia y uso
    dias_autonomia numeric(5,2) not null,
    consumo_promedio_diario_l numeric(6,2) not null,
    tasa_consumo_l_h numeric(6,2) not null,
    horas_almacenada numeric(6,2) not null,
    
    -- Banderas de alerta
    alerta_nivel_bajo boolean not null,
    alerta_tapa_abierta boolean not null,
    alerta_turbidez_alta boolean not null,
    alerta_fuga boolean not null,
    alerta_estancada boolean not null,
    
    -- Recomendacion generada en microcontrolador para el Chatbot
    recomendacion_sugerida text not null
);

-- Insercion de fila inicial unica (seed data)
insert into public.estado_tanque (
    id, distancia_cm, altura_agua_cm, litros_disponibles, porcentaje_nivel,
    turbidez_ntu, turbidez_referencia_ntu, tapa_abierta, dias_autonomia,
    consumo_promedio_diario_l, tasa_consumo_l_h, horas_almacenada,
    alerta_nivel_bajo, alerta_tapa_abierta, alerta_turbidez_alta,
    alerta_fuga, alerta_estancada, recomendacion_sugerida
) values (
    1, 0, 0, 0, 0, 0, 0, false, 0, 0, 0, 0,
    false, false, false, false, false, 'Sistema iniciado'
) on conflict (id) do nothing;

-- ============================================================================
-- 3. FUNCION RPC ATOMICA (sincronizar_tanque)
-- ============================================================================
create or replace function public.sincronizar_tanque(payload jsonb)
returns void
language plpgsql
security definer
as $$
declare
    m jsonb := payload->'mediciones';
    a jsonb := payload->'autonomia_y_consumo';
    r jsonb := payload->'alertas_reglas_fijas';
    c jsonb := payload->'contexto_chatbot';
begin
    -- A) Guardar en el historico de telemetria
    insert into public.historial_tanque (
        distancia_cm, altura_agua_cm, litros_disponibles, porcentaje_nivel,
        turbidez_ntu, tapa_abierta, tasa_consumo_l_h, dias_autonomia,
        horas_almacenada, alerta_nivel_bajo, alerta_tapa_abierta,
        alerta_turbidez_alta, alerta_fuga, alerta_estancada
    ) values (
        (m->>'distancia_sensor_cm')::numeric,
        (m->>'altura_agua_cm')::numeric,
        (m->>'litros_disponibles')::numeric,
        (m->>'porcentaje_nivel')::numeric,
        (m->>'turbidez_actual_ntu')::numeric,
        (m->>'tapa_abierta')::boolean,
        (a->>'tasa_consumo_actual_l_h')::numeric,
        (a->>'dias_restantes_estimados')::numeric,
        (a->>'horas_agua_almacenada')::numeric,
        (r->>'nivel_bajo')::boolean,
        (r->>'tapa_abierta_prolongada')::boolean,
        (r->>'turbidez_alta')::boolean,
        (r->>'posible_fuga')::boolean,
        (r->>'agua_estancada')::boolean
    );

    -- B) Actualizar el gemelo digital / estado actual unico (id = 1)
    update public.estado_tanque set
        updated_at = now(),
        modo_prototipo = (payload->>'modo_prototipo_7L')::boolean,
        uptime_seg = (payload->>'uptime_seg')::bigint,
        distancia_cm = (m->>'distancia_sensor_cm')::numeric,
        altura_agua_cm = (m->>'altura_agua_cm')::numeric,
        litros_disponibles = (m->>'litros_disponibles')::numeric,
        porcentaje_nivel = (m->>'porcentaje_nivel')::numeric,
        turbidez_ntu = (m->>'turbidez_actual_ntu')::numeric,
        turbidez_referencia_ntu = (m->>'turbidez_referencia_entrada_ntu')::numeric,
        tapa_abierta = (m->>'tapa_abierta')::boolean,
        segundos_tapa_abierta = (m->>'segundos_tapa_abierta')::bigint,
        dias_autonomia = (a->>'dias_restantes_estimados')::numeric,
        consumo_promedio_diario_l = (a->>'consumo_promedio_diario_litros')::numeric,
        tasa_consumo_l_h = (a->>'tasa_consumo_actual_l_h')::numeric,
        horas_almacenada = (a->>'horas_agua_almacenada')::numeric,
        alerta_nivel_bajo = (r->>'nivel_bajo')::boolean,
        alerta_tapa_abierta = (r->>'tapa_abierta_prolongada')::boolean,
        alerta_turbidez_alta = (r->>'turbidez_alta')::boolean,
        alerta_fuga = (r->>'posible_fuga')::boolean,
        alerta_estancada = (r->>'agua_estancada')::boolean,
        recomendacion_sugerida = coalesce(c->>'recomendacion_sugerida', '')
    where id = 1;
end;
$$;

-- ============================================================================
-- 4. SEGURIDAD Y PERMISOS (ROW LEVEL SECURITY Y RPC)
-- ============================================================================
alter table public.historial_tanque enable row level security;
alter table public.estado_tanque enable row level security;

-- Politicas permisivas para lectura e insercion publica
drop policy if exists "Lectura e insercion publica historial" on public.historial_tanque;
create policy "Lectura e insercion publica historial"
on public.historial_tanque for all using (true) with check (true);

drop policy if exists "Lectura y actualizacion publica estado" on public.estado_tanque;
create policy "Lectura y actualizacion publica estado"
on public.estado_tanque for all using (true) with check (true);

-- Permisos de ejecucion de la funcion RPC
grant execute on function public.sincronizar_tanque(jsonb) to anon, authenticated;

-- ============================================================================
-- 5. SUSCRIPCION A EVENTOS EN TIEMPO REAL (SUPABASE REALTIME)
-- ============================================================================
do $$
begin
    if not exists (
        select 1 from pg_publication_tables 
        where pubname = 'supabase_realtime' 
          and schemaname = 'public' 
          and tablename = 'estado_tanque'
    ) then
        alter publication supabase_realtime add table public.estado_tanque;
    end if;
end;
$$;
