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
    <div className="analytics-summary bg-slate-50 p-6 rounded-2xl">
      {/* Cabeçalho com título e seletor de mês */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <ChartPie className="w-6 h-6 text-indigo-500 mr-2" />
          <h2 className="text-2xl font-semibold text-slate-800">
            Dashboard {unidade.toUpperCase()}
          </h2>
        </div>
        <MonthSelector value={selectedMonth} onChange={onMonthChange} />
      </div>

      {/* Grade de cartões de análise */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Card de Tendência Mensal */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden transition-transform hover:scale-[1.01] duration-200">
          <div className="p-5 pb-0">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center">
                <TrendingUp className="w-5 h-5 text-blue-500 mr-2" />
                <h3 className="text-lg font-medium text-slate-700">Tendência Mensal</h3>
              </div>
            </div>
          </div>
          <div className="h-64 p-3">
            <LineChart 
              data={lineData} 
              height={250} 
              theme="primary"
              smooth={true}
              gradientFill={true}
            />
          </div>
        </div>

        {/* Card de Projeção */}
        <div className="transition-transform hover:scale-[1.01] duration-200">
          <ProjectionCard {...proj} />
        </div>

        {/* Card de Produtividade */}
        <div className="lg:col-span-2 transition-transform hover:scale-[1.01] duration-200">
          <HeatmapChart days={heatmap.days} data={heatmap.data} />
        </div>
      </div>

      {/* Botão para visualização detalhada */}
      <div className="flex justify-center">
        <button
          onClick={() => navigate(`/analytics/${unidade}`)}
          className="flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition-colors"
        >
          <span className="mr-2 font-medium">Ver análises detalhadas</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}