# Configuração do Supabase

Este site é estático. A URL do projeto e a chave pública anon são configuradas em `supabase-config.js`; nenhuma chave de administração deve ir para o repositório.

## Criar o banco e o usuário administrador

1. Crie um projeto Supabase e abra o SQL Editor.
2. Execute o conteúdo de `supabase/schema.sql`.
3. Em **Authentication → Users**, crie o usuário administrador com seu e-mail e uma senha exclusiva.
4. Copie o UUID desse usuário e execute no SQL Editor, substituindo o marcador:
   ```sql
   insert into public.vp_admins (user_id) values ('OWNER_AUTH_USER_UUID');
   ```
5. Em **Authentication → Providers / Sign up**, desative inscrições públicas. O painel só deve usar a conta criada pelo proprietário.
6. Em **Project Settings → API**, copie a Project URL e a chave pública anon (ou publishable key compatível, caso a configuração do projeto use essa chave). Preencha `url` e `anonKey` em `supabase-config.js`.
7. Nunca copie a chave `service_role` para arquivos do site, Vercel, navegador ou Git.

A tabela `vp_leads` permite inserção anônima de novos diagnósticos, mas não permite leitura anônima. Leitura, atualização e exclusão exigem uma sessão Supabase Auth cujo UUID esteja em `vp_admins`. A tabela de administradores só permite que cada usuário autenticado consulte a própria associação; alterações de administradores são feitas no SQL Editor.

## Leads antigos deste navegador

Após o primeiro login autorizado no painel, ele oferece importar os registros antigos encontrados na chave local `vp_leads`. Os IDs numéricos existentes são usados como chaves de deduplicação. A cópia local só é removida depois que todas as linhas forem importadas. Dados que ficaram nos navegadores de visitantes não podem ser recuperados pelo site.

## Vercel

O repositório contém HTML estático na raiz e o GitHub lista `https://victorpetra-ianegocios.vercel.app` como homepage. Isso, por si só, não confirma que o projeto Vercel esteja conectado ao GitHub nem que cada merge publique automaticamente.

1. Confirme no painel Vercel se o projeto aponta para este repositório e para a branch `main`.
2. Se estiver conectado, a integração padrão pode gerar previews para branches/PRs e publicar produção após merge em `main`. Confirme o estado real em Vercel → Deployments.
3. Depois de publicar, confira a página inicial, `/pre-diagnostico.html` e `/painel.html`.
4. Configure a Project URL e a chave pública anon no arquivo `supabase-config.js` do repositório antes do deploy de produção.
5. Faça uma submissão de diagnóstico e confirme que ela aparece no painel após login, inclusive em uma janela privada/dispositivo diferente.

O URL e a chave anon são valores públicos, protegidos por RLS; ainda assim, não os confunda com uma chave secreta. Nunca compartilhe ou registre a senha da conta administradora em arquivos do repositório.
