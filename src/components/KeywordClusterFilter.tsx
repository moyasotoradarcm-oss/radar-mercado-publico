import React from 'react';
import { KEYWORD_CLUSTERS, type KeywordClusterKey } from '../config/keywords';

interface KeywordClusterFilterProps {
  selectedClusters: readonly KeywordClusterKey[];
  onToggle: (cluster: KeywordClusterKey) => void;
  className?: string;
}

export const KeywordClusterFilter: React.FC<KeywordClusterFilterProps> = ({
  selectedClusters,
  onToggle,
  className = ''
}) => (
  <div className={`flex flex-wrap items-center gap-1.5 ${className}`} aria-label="Filtrar por rubro de palabras clave">
    <span className="text-xs font-semibold text-slate-500 mr-1">Rubros:</span>
    {(Object.keys(KEYWORD_CLUSTERS) as KeywordClusterKey[]).map((clusterKey) => {
      const cluster = KEYWORD_CLUSTERS[clusterKey];
      const isSelected = selectedClusters.includes(clusterKey);

      return (
        <button
          key={clusterKey}
          type="button"
          aria-pressed={isSelected}
          onClick={() => onToggle(clusterKey)}
          className={`px-2.5 py-1 rounded-md border text-xs font-medium transition-colors ${
            isSelected
              ? 'bg-cyan-700 text-white border-cyan-800'
              : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
          }`}
        >
          {cluster.label}
        </button>
      );
    })}
  </div>
);
