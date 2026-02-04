import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { TrendingUp, BarChart2, Calendar, ArrowRight, ChartPie } from 'lucide-react';

import MonthSelector from './MonthSelector';
import ProjectionCard from './ProjectionCard';
import HeatmapChart from './HeatmapChart';
import LineChart from './LineChart';

import {
  useMonthlyTrend,
  useDailyProductivity,
  useProjectionFromFiltered
} from '../../hooks/useAnalytics';

export default function AnalyticsSummary({
  vendasRaw,
  metas,
  configRem,
  selectedMonth,
  onMonthChange
}) {
  const { unidade } = useParams();
  const navigate = useNavigate();
  const lowerUni = unidade.toLowerCase();

  // Filtrar vendas desta unidade
  const vendasUnidade = useMemo(
    () => vendasRaw.filter(v => (v.unidade || '').toLowerCase() === lowerUni),
    [vendasRaw, lowerUni]
  );

  // Tendência mês a mês
  const trendData = useMonthlyTrend(vendasUnidade, metas, configRem);

  // Produtividade diária
  const heatmap = useDailyProductivity(vendasUnidade, metas, selectedMonth);

  // Calcular meta da unidade automaticamente
  const metaUnidadeCalculada = useMemo(() => {
    if (!metas || !Array.isArray(metas)) return 0;
    const metasDoMes = metas.filter(m => m.periodo === selectedMonth);
    const somaMetasConsultores = metasDoMes.reduce((soma, meta) => {
      return soma + Number(meta.meta || 0);
    }, 0);
    return somaMetasConsultores;
  }, [metas, selectedMonth]);

  // Projeção de fechamento
  const proj = useProjectionFromFiltered(
    vendasUnidade,
    metaUnidadeCalculada,
    selectedMonth
  );

  // Dados para o gráfico de linha
  const labels = trendData.map(item => dayjs(item.mes + '-01').format('MMM'));
  const vendasDataset = trendData.map(item => item.vendas);
  const lineData = {
    labels,
    datasets: [{
      label: 'Vendas',
      data: vendasDataset,
      borderColor: '#3B82F6',
      backgroundColor: 'rgba(59,130,246,0.2)'
    }]
  };

  return (
    <div className="analytics-summary" style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
      {/* Cabeçalho com título e seletor de mês */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <ChartPie style={{ width: '20px', height: '20px', color: '#3b82f6', marginRight: '0.5rem' }} />
          <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', margin: 0 }}>
            Dashboard {unidade.toUpperCase()}
          </h2>
        </div>
        <MonthSelector value={selectedMonth} onChange={onMonthChange} />
      </div>

      {/* Grade de cartões de análise */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Card de Tendência Mensal */}
        <div style={{ background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1rem 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <TrendingUp style={{ width: '18px', height: '18px', color: '#3b82f6', marginRight: '0.5rem' }} />
                <h3 style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151', margin: 0 }}>Tendência Mensal</h3>
              </div>
            </div>
          </div>
          <div style={{ height: '240px', padding: '0.75rem' }}>
            <LineChart 
              data={lineData} 
              height={220} 
              theme="primary"
              smooth={true}
              gradientFill={false}
            />
          </div>
        </div>

        {/* Card de Projeção */}
        <div>
          <ProjectionCard {...proj} />
        </div>

        {/* Card de Produtividade */}
        <div style={{ gridColumn: '1 / -1' }}>
          <HeatmapChart days={heatmap.days} data={heatmap.data} />
        </div>
      </div>

      {/* Botão para visualização detalhada */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={() => navigate(`/analytics/${unidade}`)}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0.625rem 1.25rem',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          <span style={{ marginRight: '0.5rem' }}>Ver análises detalhadas</span>
          <ArrowRight style={{ width: '16px', height: '16px' }} />
        </button>
      </div>
    </div>
  );
}