import React from 'react';
import { SubstanceTextureSetRequest } from '../utils/substanceImporter';
import { StudioConfig } from '../types/studioConfig';
import { ImportedUvMesh } from './Viewport3D';
import { PbrAtlasPanel } from './PbrAtlasPanel';
import { SubstanceImporterPanel } from './SubstanceImporterPanel';

interface MaterialEcosystemViewProps {
  config: StudioConfig;
  onConfigChange?: (patch: Partial<StudioConfig>) => void;
  importedUvs: ImportedUvMesh[] | null;
  onApplySubstanceToViewport: (req: SubstanceTextureSetRequest) => void;
}

export const MaterialEcosystemView: React.FC<MaterialEcosystemViewProps> = ({
  config,
  importedUvs,
  onApplySubstanceToViewport,
}) => {
  return (
    <div className="w-full max-w-none px-6 py-6 flex flex-col gap-6">
      <SubstanceImporterPanel onApplyToViewport={onApplySubstanceToViewport} />
      <PbrAtlasPanel config={config} importedUvs={importedUvs} />
    </div>
  );
};