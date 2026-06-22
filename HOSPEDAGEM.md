# Hospedagem do Meta Prato

O Meta Prato agora precisa de hospedagem Node, porque o servidor salva clientes e dados do app.

## Opção Mais Fácil: Render

1. Suba este projeto para um repositorio no GitHub.
2. No Render, escolha **New +** e depois **Blueprint**.
3. Selecione o repositorio do Meta Prato.
4. O Render vai ler o arquivo `render.yaml`.
5. Confirme o serviço `meta-prato`.
6. Aguarde o build terminar.

O app usa:

- Build: `npm install && npm run build`
- Start: `node server.mjs`
- Porta: variável `PORT` da hospedagem
- Banco local: `DATA_DIR=/var/data`

## Para funcionar com o PC desligado

O app precisa ficar em uma hospedagem na nuvem. O servidor local do Windows so funciona enquanto o computador esta ligado.

No Render, use o plano com **Persistent Disk**. O arquivo `render.yaml` ja esta configurado com:

```yaml
plan: starter
DATA_DIR: /var/data
disk:
  mountPath: /var/data
```

Isso faz os arquivos de clientes e dados do app ficarem salvos fora do seu PC.

Se usar plano sem disco persistente, o site ate abre, mas os dados gravados em arquivo podem ser perdidos quando a hospedagem reiniciar.

## Opção Fácil Também: Railway

1. Suba este projeto para o GitHub.
2. Entre no Railway.
3. Clique em **New Project**.
4. Escolha **Deploy from GitHub repo**.
5. Selecione o repositorio do Meta Prato.
6. O Railway vai usar o arquivo `railway.json`.
7. Em variaveis, configure:

```text
DATA_DIR=/data
NODE_VERSION=22
```

8. Adicione um **Volume** montado em:

```text
/data
```

9. Gere o dominio publico em **Settings > Networking > Public Domain**.

Depois teste:

```text
https://seu-dominio.railway.app/api/health
```

## Opção Arrastar e Soltar: Netlify

Use esta opcao apenas se quiser publicar uma demonstracao sem servidor central.

Arquivo:

```text
outputs/meta-prato-site.html
```

Ele abre o app, mas os dados ficam no navegador de cada pessoa. Nao e ideal para guardar clientes em servidor.

## Rotas do servidor

- Site: `/`
- Saúde do servidor: `/api/health`
- Clientes: `/api/patients`
- Login: `/api/login`
- Cadastro: `/api/register`
- Dados do app: `/api/data/:patientId`

## Rodar local

```bash
npm install
npm run dev
```

Depois abra:

```text
http://127.0.0.1:5173/
```

## Importante

Use uma hospedagem com disco persistente para não perder os dados dos clientes. Em Render, o `render.yaml` já cria um disco em `/var/data`.
