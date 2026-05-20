import React, { useState } from 'react';
import { Download, ShieldAlert, ExternalLink, ArrowRight, ShieldCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/features/produto/components/ui/dialog';
import { Button } from '@/features/produto/components/ui/button';

interface DownloadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  downloadUrl: string;
}

export function NexusIconSm({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={(size * 80) / 112} viewBox="0 0 112 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <linearGradient id="grad" x1="56" y1="16" x2="56" y2="64">
        <stop offset="0%" stopColor="#FF5A1F" />
        <stop offset="100%" stopColor="#FF5A1F" stopOpacity="0.65" />
      </linearGradient>
      <line x1="28" y1="16" x2="28" y2="64" stroke="#FF5A1F" strokeWidth="3.5" />
      <line x1="84" y1="16" x2="84" y2="64" stroke="#FF5A1F" strokeWidth="3.5" />
      <line x1="28" y1="40" x2="56" y2="16" stroke="url(#grad)" strokeWidth="4" />
      <line x1="56" y1="16" x2="56" y2="64" stroke="url(#grad)" strokeWidth="4" />
      <line x1="56" y1="64" x2="84" y2="40" stroke="url(#grad)" strokeWidth="4" />
      <circle cx="56" cy="16" r="4" fill="#FF5A1F" />
      <circle cx="56" cy="64" r="4" fill="#FF5A1F" />
      <circle cx="28" cy="16" r="4" fill="#FF5A1F" opacity="0.6" />
      <circle cx="28" cy="64" r="4" fill="#FF5A1F" opacity="0.6" />
      <circle cx="84" cy="16" r="4" fill="#FF5A1F" opacity="0.6" />
      <circle cx="84" cy="64" r="4" fill="#FF5A1F" opacity="0.6" />
      <circle cx="28" cy="40" r="5.5" fill="#FF5A1F" />
      <circle cx="84" cy="40" r="5.5" fill="#FF5A1F" />
    </svg>
  );
}

export function DownloadPrintModal({ open, onOpenChange, downloadUrl }: DownloadModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [downloadStarted, setDownloadStarted] = useState(false);

  const handleStartDownload = () => {
    setDownloadStarted(true);
    
    // Padrão correto para forçar download sem interferir no roteador SPA
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = 'assistente-impressao-nexus.exe';
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    
    // Avança instantaneamente para o Passo 2 para exibir as instruções de instalação
    setStep(2);
  };

  const handleClose = () => {
    // Reseta o estado do modal ao fechar
    setStep(1);
    setDownloadStarted(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) handleClose(); }}>
      <DialogContent 
        className="w-full max-w-lg overflow-hidden border border-border p-6 shadow-2xl rounded-2xl bg-[#060F0A]"
        style={{
          background: 'radial-gradient(circle at top left, rgba(255, 90, 31, 0.08) 0%, transparent 50%), radial-gradient(circle at bottom right, rgba(0, 204, 122, 0.03) 0%, transparent 50%), #0C1A12'
        }}
      >
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center gap-3 border-b border-border/40 pb-4">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <NexusIconSm size={28} />
            </div>
            <div>
              <DialogTitle className="text-xl font-syne font-extrabold text-foreground tracking-tight">
                {step === 1 ? 'Instalar Nexus Print' : 'Autorizar Conexão Segura'}
              </DialogTitle>
              <DialogDescription className="text-xs font-inter text-muted-foreground">
                {step === 1 ? 'Passo 1 de 2: Download do assistente local' : 'Passo 2 de 2: Ativação do Certificado SSL'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Passo 1: Download e Explicação */}
        {step === 1 ? (
          <div className="space-y-5 pt-3">
            <div className="text-sm font-inter text-[#C4DDD0] leading-relaxed">
              Para permitir a <span className="text-primary font-semibold">impressão silenciosa direta</span> de etiquetas sem precisar abrir a tela de PDF do navegador a cada impressão, você precisa instalar o nosso assistente local.
            </div>

            {/* Box de Alerta SmartScreen Estilizado */}
            <div className="flex gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-primary">
              <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
              <div className="text-xs font-inter space-y-1">
                <p className="font-extrabold uppercase tracking-wider text-[10px] text-[#FF5A1F]">Aviso do Windows SmartScreen</p>
                <p className="leading-relaxed text-[#7AA88E]">
                  Por ser um software novo e exclusivo, o Windows exibirá a tela de <strong className="text-foreground font-semibold">"Editor Desconhecido"</strong>. Isso é normal. Clique em <strong className="text-[#FF5A1F] font-bold">"Mais informações"</strong> e depois em <strong className="text-[#FF5A1F] font-bold">"Executar assim mesmo"</strong>.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button 
                variant="outline" 
                onClick={handleClose}
                className="rounded-xl border border-border px-5 text-xs font-semibold text-muted-foreground hover:bg-secondary/40 hover:text-foreground transition-all duration-200"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleStartDownload}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#FF5A1F] text-[#1A0500] hover:bg-[#FF5A1F]/90 px-6 py-2 text-xs font-extrabold shadow-lg shadow-[#FF5A1F]/25 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              >
                Baixar Assistente
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          /* Passo 2: Pós-Instalação e Autorização SSL (Multibrowser) */
          <div className="space-y-5 pt-3">
            <div className="text-xs font-inter space-y-3">
              <p className="text-[#C4DDD0] leading-relaxed">
                O download foi iniciado. Após executá-lo, é necessário autorizar o navegador a se conectar localmente com segurança (`wss://`) para transmitir as etiquetas.
              </p>
              
              <div className="rounded-xl border border-border/40 bg-[#122018]/50 p-4 space-y-3">
                <p className="font-bold text-foreground text-sm font-syne">Como ativar o conector local:</p>
                <ol className="list-decimal pl-4 space-y-2 text-[#7AA88E] text-[11px] leading-relaxed">
                  <li>Clique no botão verde <strong className="text-emerald-500 font-bold">"Autorizar Conector"</strong> abaixo.</li>
                  <li>Uma nova guia se abrirá exibindo o aviso de privacidade do seu navegador.</li>
                  <li>
                    <strong>No Chrome / Edge / Opera:</strong> Clique em <strong className="text-foreground font-semibold">"Avançado"</strong> e depois em <strong className="text-foreground font-semibold">"Continuar para localhost (não seguro)"</strong>.
                  </li>
                  <li>
                    <strong>No Firefox:</strong> Clique em <strong className="text-foreground font-semibold">"Avançado..."</strong> e depois no botão <strong className="text-foreground font-semibold">"Aceitar o risco e continuar"</strong>.
                  </li>
                  <li>Pronto! O canal SSL local será ativado e você já pode fechar a aba de autorização.</li>
                </ol>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button 
                variant="outline"
                onClick={handleClose}
                className="rounded-xl border border-border px-5 text-xs font-semibold text-muted-foreground hover:bg-secondary/40 hover:text-foreground transition-all duration-200"
              >
                Concluir
              </Button>
              <a 
                href="https://localhost:12212"
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleClose}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#00CC7A] hover:bg-[#00CC7A]/90 text-[#1A0500] px-6 py-2 text-xs font-extrabold shadow-lg shadow-[#00CC7A]/25 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              >
                Autorizar Conector
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
