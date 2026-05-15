import { BookOpen, DollarSign, Trophy, AlertTriangle, ShieldCheck } from 'lucide-react';

const secoes = [
  {
    icon: <DollarSign size={18} />,
    titulo: 'Depósitos',
    items: [
      'Valor mínimo de depósito: R$ 20,00',
      'Transfira via Pix para a chave indicada na aba "Depositar"',
      'Após transferir, clique em "Já fiz o Pix" para solicitar aprovação',
      'O admin aprova seu depósito e o saldo é creditado automaticamente',
    ],
  },
  {
    icon: <Trophy size={18} />,
    titulo: 'Apostas',
    items: [
      'Valor mínimo por aposta: R$ 5,00',
      'Você pode apostar no resultado do jogo (Time A, Empate ou Time B)',
      'Mercados extras disponíveis: Ambos Marcam, Mais/Menos Gols, Pênaltis',
      'Mercado Artilheiro: aposte em quem marca mais gols no jogo',
      'Longo Prazo: apostas em campeão ou outros mercados especiais',
      'Você pode editar sua aposta enquanto o mercado estiver aberto',
    ],
  },
  {
    icon: <DollarSign size={18} />,
    titulo: 'Saques',
    items: [
      'Solicite saque na aba "Sacar" informando sua chave Pix',
      'O admin processa o pagamento manualmente via Pix',
      'Você pode acompanhar o status do saque na mesma aba',
    ],
  },
  {
    icon: <ShieldCheck size={18} />,
    titulo: 'Ranking e Pontuação',
    items: [
      'Cada aposta vencedora vale 3 pontos no ranking',
      'O ranking conta vitórias em todos os mercados (jogos, extras, longo prazo, artilheiro)',
      'Em caso de empate em pontos, desempata pelo total de prêmios ganhos',
      'Acompanhe sua posição na aba "Ranking"',
    ],
  },
  {
    icon: <AlertTriangle size={18} />,
    titulo: 'Regras Gerais',
    items: [
      'Apostas encerram quando o admin fecha o mercado (antes do início do jogo)',
      'Resultados são definidos exclusivamente pelo admin',
      'Qualquer tentativa de fraude resulta em banimento',
      'Dúvidas? Fale com o administrador',
    ],
  },
];

export default function Regras() {
  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <BookOpen size={22} style={{ color: '#FFD000' }} />
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Regras do Site</h2>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {secoes.map((s, i) => (
          <div key={i} className="card-golbet" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ color: '#FFD000' }}>{s.icon}</span>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{s.titulo}</span>
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {s.items.map((item, j) => (
                <li key={j} style={{ fontSize: 13, color: 'var(--texto-sec)', lineHeight: 1.5 }}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
