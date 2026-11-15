import React from 'react';
import { SubstanceTextureSetRequest } from '../utils/substanceImporter';
import { StudioConfig } from '../types/studioConfig';
import { ImportedUvMesh } from './Viewport3D';
import { PbrAtlasPanel } from './PbrAtlasPanel';
import { SubstanceImporterPanel } from './SubstanceImporterPanel';

interface MaterialEcosystemViewProps {
  config: StudioConfig;
  importedUvs: ImportedUvMesh[] | null;
  onApplySubstanceToViewport: (req: SubstanceTextureSetRequest) => void;
}

export const MaterialEcosystemView: React.FC<MaterialEcosystemViewProps> = ({
  config,
  importedUvs,
  onApplySubstanceToViewport,
}) => {
  return (
    <div className="max-w-[1280px] mx-auto px-6 py-8 flex flex-col gap-8">
      <SubstanceImporterPanel onApplyToViewport={onApplySubstanceToViewport} />
      <PbrAtlasPanel config={config} importedUvs={importedUvs} />
    </div>
  );
};
