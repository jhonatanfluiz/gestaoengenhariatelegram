-- =====================================================================
-- SCRIPT DE ATUALIZAÇÃO PARA OCORRÊNCIAS/MENSAGENS E STORAGE
-- =====================================================================

-- 1. Criação da Tabela mensagens_obra
CREATE TABLE IF NOT EXISTS public.mensagens_obra (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    obra_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    fase_id UUID REFERENCES public.phases(id) ON DELETE SET NULL,
    texto_tecnico TEXT NOT NULL,
    imagem_url TEXT,
    resposta_gestor TEXT,
    status TEXT NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Resolvido')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Habilitar RLS e criar Políticas
ALTER TABLE public.mensagens_obra ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura irrestrita de mensagens_obra" ON public.mensagens_obra FOR SELECT USING (true);
CREATE POLICY "Modificação irrestrita de mensagens_obra" ON public.mensagens_obra FOR ALL USING (true);

-- 3. Criação do Bucket de Storage (ocorrencias) e Políticas
INSERT INTO storage.buckets (id, name, public) 
VALUES ('ocorrencias', 'ocorrencias', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'ocorrencias');
CREATE POLICY "Public Insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'ocorrencias');
CREATE POLICY "Public Update" ON storage.objects FOR UPDATE USING (bucket_id = 'ocorrencias');
CREATE POLICY "Public Delete" ON storage.objects FOR DELETE USING (bucket_id = 'ocorrencias');
