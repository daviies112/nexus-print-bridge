const fs = require('fs');
const path = require('path');
const https = require('https');
const os = require('os');
const { exec } = require('child_process');
const axios = require('axios');
const { WebSocketServer } = require('ws');
const selfsigned = require('selfsigned');

const PORT = 12212;
const TEMP_DIR = os.tmpdir();
const SUMATRA_TEMP_PATH = path.join(TEMP_DIR, 'SumatraPDF-nexus.exe');

// 1. Garantir Certificados SSL
const keyPath = path.join(process.cwd(), 'key.pem');
const certPath = path.join(process.cwd(), 'cert.pem');

let privateKey, certificate;

if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
  console.log('[NexusPrint] Certificados SSL não encontrados. Gerando novos certificados...');
  try {
    const attrs = [
      { name: 'commonName', value: 'localhost' },
      { name: 'organizationName', value: 'Nexus' }
    ];
    const pems = selfsigned.generate(attrs, { days: 3650, keySize: 2048 }); // Válido por 10 anos
    
    fs.writeFileSync(keyPath, pems.private);
    fs.writeFileSync(certPath, pems.cert);
    
    privateKey = pems.private;
    certificate = pems.cert;
    console.log('[NexusPrint] Certificados SSL autoassinados gerados com sucesso.');
  } catch (err) {
    console.error('[NexusPrint] Erro ao gerar certificados SSL:', err);
    process.exit(1);
  }
} else {
  privateKey = fs.readFileSync(keyPath, 'utf8');
  certificate = fs.readFileSync(certPath, 'utf8');
}

// 2. Extrair SumatraPDF do executável pkg se necessário
const sumatraSourcePath = path.join(__dirname, 'bin', 'SumatraPDF.exe');

function extractSumatraPDF() {
  try {
    console.log('[NexusPrint] Verificando executável do SumatraPDF...');
    if (fs.existsSync(sumatraSourcePath)) {
      // Lê o executável e escreve na pasta temporária para execução
      const data = fs.readFileSync(sumatraSourcePath);
      fs.writeFileSync(SUMATRA_TEMP_PATH, data);
      fs.chmodSync(SUMATRA_TEMP_PATH, 0o755);
      console.log(`[NexusPrint] SumatraPDF extraído com sucesso para: ${SUMATRA_TEMP_PATH}`);
    } else {
      // Se não estiver em bin (ex: ambiente dev sem o binário ainda), avisa
      console.warn('[NexusPrint] SumatraPDF.exe não encontrado na pasta bin/. Por favor, certifique-se de baixá-lo.');
    }
  } catch (err) {
    console.error('[NexusPrint] Erro ao extrair SumatraPDF:', err);
  }
}

extractSumatraPDF();

// 3. Inicializar Servidor HTTPS
const credentials = { key: privateKey, cert: certificate };
const server = https.createServer(credentials, (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
  res.end('Nexus Print Bridge is Running via Secure Connection!\n');
});

// 4. Inicializar WebSocket acoplado ao HTTPS
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  const clientUrl = req.url;
  console.log(`[NexusPrint] Novo cliente conectado: ${clientUrl}`);

  ws.on('message', async (message) => {
    console.log(`[NexusPrint] Mensagem recebida: ${message}`);
    try {
      const payload = JSON.parse(message);
      const { type, url, base64 } = payload;

      if (!url && !base64) {
        throw new Error('Nenhuma URL ou dados Base64 do PDF informados no payload.');
      }

      const tempPdfPath = path.join(TEMP_DIR, `print_${Date.now()}.pdf`);

      if (base64) {
        console.log(`[NexusPrint] Iniciando impressão de ${type || 'documento'} via Base64...`);
        // Remove cabeçalhos data URL se existirem
        const cleanBase64 = base64.replace(/^data:application\/pdf;base64,/, '');
        fs.writeFileSync(tempPdfPath, Buffer.from(cleanBase64, 'base64'));
      } else {
        console.log(`[NexusPrint] Iniciando impressão de ${type || 'documento'} via URL: ${url}`);
        console.log(`[NexusPrint] Baixando arquivo PDF para: ${tempPdfPath}`);
        
        const response = await axios({
          method: 'get',
          url: url,
          responseType: 'stream'
        });

        const writer = fs.createWriteStream(tempPdfPath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
        });
      }

      console.log('[NexusPrint] Arquivo pronto. Enviando para a impressora silenciosamente...');

      // 6. Execução silenciosa do SumatraPDF
      if (!fs.existsSync(SUMATRA_TEMP_PATH)) {
        extractSumatraPDF();
      }

      if (!fs.existsSync(SUMATRA_TEMP_PATH)) {
        throw new Error('Executável do SumatraPDF não disponível.');
      }

      // Comando de impressão silenciosa do Windows para a impressora padrão
      const command = `"${SUMATRA_TEMP_PATH}" -print-to-default -silent "${tempPdfPath}"`;

      exec(command, (execErr, stdout, stderr) => {
        // Limpeza imediata do PDF temporário
        try {
          if (fs.existsSync(tempPdfPath)) {
            fs.unlinkSync(tempPdfPath);
          }
        } catch (unlinkErr) {
          console.error('[NexusPrint] Erro ao deletar PDF temporário:', unlinkErr);
        }

        if (execErr) {
          console.error('[NexusPrint] Erro na execução da impressão:', execErr);
          ws.send(JSON.stringify({ status: 'error', message: execErr.message }));
          return;
        }

        console.log('[NexusPrint] Impressão enviada com sucesso para a fila do Windows.');
        ws.send(JSON.stringify({ status: 'success', message: 'Impressão enviada com sucesso.' }));
      });

    } catch (err) {
      console.error('[NexusPrint] Falha ao processar mensagem:', err.message);
      ws.send(JSON.stringify({ status: 'error', message: err.message }));
    }
  });

  ws.on('close', () => {
    console.log('[NexusPrint] Conexão encerrada pelo cliente.');
  });
});

server.listen(PORT, () => {
  console.log(`[NexusPrint] Servidor WebSocket seguro rodando em wss://localhost:${PORT}`);
});
