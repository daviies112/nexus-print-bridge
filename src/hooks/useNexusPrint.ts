import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from './use-toast';

interface UseNexusPrintOptions {
  deviceKey: string; // Ex: 'etiqueta', 'nf'
}

export function useNexusPrint({ deviceKey }: UseNexusPrintOptions) {
  const [connected, setConnected] = useState(false);
  const [printing, setPrinting] = useState(false);
  
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fallbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) return;

    // Conexão WSS criptografada para localhost na porta padrão 12212
    const ws = new WebSocket(`wss://localhost:12212/printer/${deviceKey}`);

    ws.onopen = () => {
      setConnected(true);
      console.log(`[NexusPrint] Canal local conectado na chave: ${deviceKey}`);
      if (reconnectTimerRef.current) {
        clearInterval(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    ws.onclose = () => {
      setConnected(false);
      // Agenda reconexão limpa a cada 7 segundos para evitar memory leaks
      if (!reconnectTimerRef.current) {
        reconnectTimerRef.current = setInterval(() => {
          connectRef.current();
        }, 7000);
      }
    };

    ws.onerror = () => {
      setConnected(false);
    };

    ws.onmessage = (event) => {
      try {
        const response = JSON.parse(event.data as string);

        // Cancela o timer de fallback — chegou resposta real do servidor
        if (fallbackTimerRef.current) {
          clearTimeout(fallbackTimerRef.current);
          fallbackTimerRef.current = null;
        }

        setPrinting(false);

        if (response.status === 'success') {
          toast({
            title: "Impressão Concluída",
            description: response.message || "Documento enviado com sucesso.",
          });
        } else {
          toast({
            title: "Erro na Impressão",
            description: response.message || "Erro desconhecido na impressora.",
            variant: "destructive",
          });
        }
      } catch {
        // Resposta não era JSON válido — ignorar silenciosamente
      }
    };

    socketRef.current = ws;
  }, [deviceKey]);

  const connectRef = useRef(connect);
  
  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    connectRef.current();
    return () => {
      // Limpeza completa de recursos no unmount para prevenir memory leaks
      if (socketRef.current) {
        socketRef.current.close();
      }
      if (reconnectTimerRef.current) {
        clearInterval(reconnectTimerRef.current);
      }
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
      }
    };
  }, [connect]);

  const sendToPrinter = useCallback((signedPdfUrl: string) => {
    if (!connected || !socketRef.current) {
      return false;
    }

    setPrinting(true);

    const payload = {
      type: deviceKey,
      url: signedPdfUrl
    };

    socketRef.current.send(JSON.stringify(payload));

    // Fallback de 15 segundos (safety net) para liberar a interface caso a resposta não venha
    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    fallbackTimerRef.current = setTimeout(() => {
      setPrinting(false);
      toast({
        title: "Sem Resposta",
        description: "A impressora não confirmou em 15 segundos. Verifique a fila.",
        variant: "destructive",
      });
    }, 15000);

    return true;
  }, [connected, deviceKey]);

  const sendBase64ToPrinter = useCallback((pdfBase64: string) => {
    if (!connected || !socketRef.current) {
      return false;
    }

    setPrinting(true);

    const payload = {
      type: deviceKey,
      base64: pdfBase64
    };

    socketRef.current.send(JSON.stringify(payload));

    // Fallback de 15 segundos (safety net) para liberar a interface caso a resposta não venha
    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    fallbackTimerRef.current = setTimeout(() => {
      setPrinting(false);
      toast({
        title: "Sem Resposta",
        description: "A impressora não confirmou em 15 segundos. Verifique a fila.",
        variant: "destructive",
      });
    }, 15000);

    return true;
  }, [connected, deviceKey]);

  return { connected, printing, sendToPrinter, sendBase64ToPrinter };
}
