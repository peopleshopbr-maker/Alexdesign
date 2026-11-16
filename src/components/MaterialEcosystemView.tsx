import React from 'react';
import {
  SubstanceChannelId,
  SubstanceTextureSetRequest,
  SubstanceTextureSlot,
} from '../utils/substanceImporter';
import { StudioConfig } from '../types/studioConfig';
import { ImportedUvMesh } from './Viewport3D';
import { PbrAtlasPanel } from './PbrAtlasPanel';
import { SubstanceImporterPanel } from './SubstanceImporterPanel';

interface MaterialEcosystemViewProps {
  config: StudioConfig;
  importedUvs: ImportedUvMesh[] | null;
  onApplySubstanceToViewport: (req: SubstanceTextureSetRequest) => void;
  substanceSlots: Partial<Record<SubstanceChannelId, SubstanceTextureSlot>>;
  onSubstanceSlotsChange: React.Dispatch<
    React.SetStateAction<Partial<Record<SubstanceChannelId, SubstanceTextureSlot>>>
  >;
  substanceMaterialName: string;
  onSubstanceMaterialNameChange: (name: string) => void;
  selectedGlbMeshIdx: number;
  onSelectGlbMeshIdx: (idx: number) => void;
}

export const MaterialEcosystemView: React.FC<MaterialEcosystemViewProps> = ({
  config,
  importedUvs,
  onApplySubstanceToViewport,
  substanceSlots,
  onSubstanceSlotsChange,
  substanceMaterialName,
  onSubstanceMaterialNameChange,
  selectedGlbMeshIdx,
  onSelectGlbMeshIdx,
}) => {
  return (
    <div className="max-w-[1280px] mx-auto px-3.5 py-5 sm:px-6 sm:py-8 flex flex-col gap-6 sm:gap-8">
      <SubstanceImporterPanel
        onApplyToViewport={onApplySubstanceToViewport}
        importedUvs={importedUvs}
        slots={substanceSlots}
        onSlotsChange={onSubstanceSlotsChange}
        materialName={substanceMaterialName}
        onMaterialNameChange={onSubstanceMaterialNameChange}
        selectedGlbMeshIdx={selectedGlbMeshIdx}
        onSelectGlbMeshIdx={onSelectGlbMeshIdx}
      />
      <PbrAtlasPanel config={config} importedUvs={importedUvs} />
    </div>
  );
};
