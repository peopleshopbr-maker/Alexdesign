import * as THREE from 'three';

export interface BoneHierarchyNode {
  name: string;
  parentName: string | null;
}

const _posA = new THREE.Vector3();
const _posB = new THREE.Vector3();
const _mid = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();

const CYAN_JOINT_COLOR = 0x38bdf8;
const CYAN_BONE_COLOR = 0x22d3ee;
const SELECTED_JOINT_COLOR = 0xf97316;
const IK_END_JOINT_COLOR = 0xfacc15;

interface BoneSegmentItem {
  parentBone: THREE.Bone;
  childBone: THREE.Bone;
  mesh: THREE.Mesh;
}

interface JointProxyItem {
  bone: THREE.Bone;
  mesh: THREE.Mesh;
  isIkEnd: boolean;
}

const IK_END_BONE_REGEX = /(hand|wrist|foot|ankle)_(l|r)$/i;

/**
 * Interactive X-Ray Skeleton Visualizer with:
 * - Clickable cyan joint spheres (orange when selected, yellow halo on IK ends)
 * - Crisp cyan bone connector rods between parent & child bones
 * - Yellow IK constraint guide lines (shoulder -> hand, hip -> foot)
 */
export class SkeletonVisualizerRig {
  public readonly group: THREE.Group;
  public readonly jointProxies: THREE.Mesh[] = [];
  private joints: JointProxyItem[] = [];
  private segments: BoneSegmentItem[] = [];
  private ikGuideLines: THREE.LineSegments | null = null;
  private ikGuidePairs: [THREE.Bone, THREE.Bone][] = [];

  private jointGeo: THREE.SphereGeometry;
  private boneRodGeo: THREE.CylinderGeometry;
  private rodMat: THREE.MeshBasicMaterial;
  private ikLineMat: THREE.LineBasicMaterial;
  private selectedBoneName: string | null = null;
  private showIkGuides = true;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'AlexDesign_SkeletonVisualizer';
    this.group.renderOrder = 1000;

    this.jointGeo = new THREE.SphereGeometry(0.024, 14, 12);
    this.boneRodGeo = new THREE.CylinderGeometry(0.0065, 0.011, 1, 8, 1);

    this.rodMat = new THREE.MeshBasicMaterial({
      color: CYAN_BONE_COLOR,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      opacity: 0.88,
    });

    this.ikLineMat = new THREE.LineBasicMaterial({
      color: IK_END_JOINT_COLOR,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      opacity: 0.85,
    });
  }

  public setBones(bones: THREE.Bone[], showIkGuides = true): void {
    this.clearVisuals();
    this.showIkGuides = showIkGuides;
    if (bones.length === 0) return;

    const boneSet = new Set(bones);
    const byLower = new Map<string, THREE.Bone>();
    bones.forEach((b) => byLower.set(b.name.toLowerCase(), b));

    for (const bone of bones) {
      const isIkEnd = IK_END_BONE_REGEX.test(bone.name);
      const mat = new THREE.MeshBasicMaterial({
        color: isIkEnd ? IK_END_JOINT_COLOR : CYAN_JOINT_COLOR,
        depthTest: false,
        depthWrite: false,
        transparent: true,
        opacity: 0.96,
      });
      const sphere = new THREE.Mesh(this.jointGeo, mat);
      sphere.name = `BoneJoint_${bone.name}`;
      sphere.renderOrder = 1002;
      sphere.userData = {
        isBoneProxy: true,
        boneName: bone.name,
        isIkEnd,
      };
      this.group.add(sphere);
      this.jointProxies.push(sphere);
      this.joints.push({ bone, mesh: sphere, isIkEnd });

      if (bone.parent && (bone.parent as THREE.Bone).isBone && boneSet.has(bone.parent as THREE.Bone)) {
        const rod = new THREE.Mesh(this.boneRodGeo, this.rodMat);
        rod.name = `BoneRod_${bone.parent.name}_${bone.name}`;
        rod.renderOrder = 1000;
        rod.userData = { isBoneVisual: true };
        this.group.add(rod);
        this.segments.push({
          parentBone: bone.parent as THREE.Bone,
          childBone: bone,
          mesh: rod,
        });
      }
    }

    // Build yellow IK triangle guide pairs (shoulder->hand, hip->foot, hand_L->hand_R, foot_L->foot_R)
    const findAny = (...candidates: string[]): THREE.Bone | undefined => {
      for (const c of candidates) {
        const found = byLower.get(c.toLowerCase());
        if (found) return found;
      }
      return undefined;
    };

    const upL = findAny('upper_arm_L', 'upperarm_l', 'LeftArm');
    const handL = findAny('hand_L', 'hand_l', 'LeftHand');
    const upR = findAny('upper_arm_R', 'upperarm_r', 'RightArm');
    const handR = findAny('hand_R', 'hand_r', 'RightHand');
    const thighL = findAny('thigh_L', 'thigh_l', 'LeftUpLeg');
    const footL = findAny('foot_L', 'foot_l', 'LeftFoot');
    const thighR = findAny('thigh_R', 'thigh_r', 'RightUpLeg');
    const footR = findAny('foot_R', 'foot_r', 'RightFoot');

    const pairs: [THREE.Bone, THREE.Bone][] = [];
    if (upL && handL) pairs.push([upL, handL]);
    if (upR && handR) pairs.push([upR, handR]);
    if (thighL && footL) pairs.push([thighL, footL]);
    if (thighR && footR) pairs.push([thighR, footR]);
    if (handL && footL) pairs.push([handL, footL]);
    if (handR && footR) pairs.push([handR, footR]);

    this.ikGuidePairs = pairs;
    if (pairs.length > 0) {
      const lineGeo = new THREE.BufferGeometry();
      lineGeo.setAttribute(
        'position',
        new THREE.BufferAttribute(new Float32Array(pairs.length * 6), 3)
      );
      const lines = new THREE.LineSegments(lineGeo, this.ikLineMat);
      lines.name = 'IK_Constraint_Guides';
      lines.renderOrder = 1001;
      lines.frustumCulled = false;
      lines.visible = showIkGuides;
      this.group.add(lines);
      this.ikGuideLines = lines;
    }

    this.update();
  }

  public setSelectedBone(boneName: string | null): void {
    this.selectedBoneName = boneName;
    for (const item of this.joints) {
      const mat = item.mesh.material as THREE.MeshBasicMaterial;
      const isSelected = item.bone.name === boneName;
      if (isSelected) {
        mat.color.setHex(SELECTED_JOINT_COLOR);
        item.mesh.scale.setScalar(1.45);
      } else {
        mat.color.setHex(item.isIkEnd ? IK_END_JOINT_COLOR : CYAN_JOINT_COLOR);
        item.mesh.scale.setScalar(1.0);
      }
    }
  }

  public setIkGuidesVisible(visible: boolean): void {
    this.showIkGuides = visible;
    if (this.ikGuideLines) {
      this.ikGuideLines.visible = visible;
    }
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  public update(): void {
    if (!this.group.visible) return;

    for (const item of this.joints) {
      item.bone.getWorldPosition(_posA);
      item.mesh.position.copy(_posA);
    }

    for (const seg of this.segments) {
      seg.parentBone.getWorldPosition(_posA);
      seg.childBone.getWorldPosition(_posB);
      const len = _posA.distanceTo(_posB);
      if (len < 1e-4) {
        seg.mesh.visible = false;
        continue;
      }
      seg.mesh.visible = true;
      _mid.addVectors(_posA, _posB).multiplyScalar(0.5);
      _dir.subVectors(_posB, _posA).divideScalar(len);
      _quat.setFromUnitVectors(_up, _dir);
      seg.mesh.position.copy(_mid);
      seg.mesh.quaternion.copy(_quat);
      _scale.set(1, len, 1);
      seg.mesh.scale.copy(_scale);
    }

    if (this.ikGuideLines && this.showIkGuides && this.ikGuidePairs.length > 0) {
      const posAttr = this.ikGuideLines.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < this.ikGuidePairs.length; i++) {
        const [bA, bB] = this.ikGuidePairs[i];
        bA.getWorldPosition(_posA);
        bB.getWorldPosition(_posB);
        posAttr.setXYZ(i * 2, _posA.x, _posA.y, _posA.z);
        posAttr.setXYZ(i * 2 + 1, _posB.x, _posB.y, _posB.z);
      }
      posAttr.needsUpdate = true;
    }
  }

  private clearVisuals(): void {
    for (const item of this.joints) {
      this.group.remove(item.mesh);
      (item.mesh.material as THREE.Material).dispose();
    }
    for (const seg of this.segments) {
      this.group.remove(seg.mesh);
    }
    if (this.ikGuideLines) {
      this.group.remove(this.ikGuideLines);
      this.ikGuideLines.geometry.dispose();
      this.ikGuideLines = null;
    }
    this.joints = [];
    this.jointProxies.length = 0;
    this.segments = [];
    this.ikGuidePairs = [];
    if (this.selectedBoneName) {
      // Keep selection name until next setBones + setSelectedBone
    }
  }

  public dispose(): void {
    this.clearVisuals();
    this.jointGeo.dispose();
    this.boneRodGeo.dispose();
    this.rodMat.dispose();
    this.ikLineMat.dispose();
  }
}
