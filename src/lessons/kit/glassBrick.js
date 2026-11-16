// 砖内的每条视线从实际相机出发，在有限玻璃砖的入射面和出射面分别折射。
// 先从实针上剪去被砖遮住的直视部分，再在砖面绘出折射像，原场景的底色仍可透过。
import * as THREE from 'three';
import { GLASS_INDEX, SLAB_WIDTH, SLAB_THICKNESS } from './glassSlab.js';
export const BRICK_HEIGHT = 0.047,
  PIN_HEIGHT = 0.035,
  HEAD_RADIUS = 0.0021,
  SHAFT_RADIUS = 0.00055;
export function glassBrick(pins, colors) {
  const half = new THREE.Vector3(SLAB_WIDTH / 2, BRICK_HEIGHT / 2, SLAB_THICKNESS / 2);
  const uniforms = {
    eye: { value: new THREE.Vector3() },
    halfSize: { value: half },
    pins: { value: pins.map(() => new THREE.Vector3()) },
    colors: { value: colors.map((c) => new THREE.Color(c)) },
    eta: { value: GLASS_INDEX },
  };
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms,
    vertexShader: `varying vec3 p; varying vec3 n;
      void main(){p=position;n=normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec3 p; varying vec3 n;
      uniform vec3 eye,halfSize;uniform vec3 pins[4];uniform vec3 colors[4];uniform float eta;
      const float INF=1000.;const float EPS=.000003;
      float sphere(vec3 origin,vec3 ray,vec3 center,float r){
        vec3 s=origin-center;float b=dot(s,ray),q=b*b-dot(s,s)+r*r;
        if(q<0.)return INF;float t=-b-sqrt(q);return t>0.?t:INF;
      }
      float shaft(vec3 origin,vec3 ray,vec3 center){
        vec2 s=origin.xz-center.xz;float a=dot(ray.xz,ray.xz),b=dot(s,ray.xz);
        float q=b*b-a*(dot(s,s)-${SHAFT_RADIUS}*${SHAFT_RADIUS});
        if(a<1.e-9||q<0.)return INF;
        float t=(-b-sqrt(q))/a,h=origin.y+t*ray.y-center.y;
        return t>0.&&h>=0.&&h<=${PIN_HEIGHT}?t:INF;
      }
      float closestPin(vec3 origin,vec3 ray,out vec3 color){
        float best=INF;color=vec3(0.);
        for(int i=0;i<4;i++){
          float t=shaft(origin,ray,pins[i]);if(t<best){best=t;color=vec3(.22,.25,.25);}
          vec3 center=pins[i]+vec3(0.,${PIN_HEIGHT},0.);
          t=sphere(origin,ray,center,${HEAD_RADIUS});
          if(t<best){best=t;vec3 norm=normalize(origin+t*ray-center);
            color=colors[i]*(0.72+0.28*max(0.,dot(norm,normalize(vec3(-.3,1.,.4)))));}
        }
        return best;
      }
      vec3 escape(vec3 pos,vec3 ray,out float t){
        vec3 times=vec3(INF);
        for(int i=0;i<3;i++)if(abs(ray[i])>1.e-7)times[i]=(sign(ray[i])*halfSize[i]-pos[i])/ray[i];
        t=min(times.x,min(times.y,times.z));
        if(t==times.x)return vec3(sign(ray.x),0.,0.);
        if(t==times.y)return vec3(0.,sign(ray.y),0.);
        return vec3(0.,0.,sign(ray.z));
      }
      void main(){
        vec3 incident=normalize(p-eye),normal=normalize(n);
        vec3 ray=refract(incident,normal,1./eta),pos=p+EPS*ray;
        // 两个长侧面抛光，短端和上表面磨砂，底面贴纸。
        float t;vec3 exitNormal=escape(pos,ray,t);
        bool transmitted=abs(normal.z)>.99 && dot(normal,exitNormal)<-.99;
        pos+=ray*max(t,0.);
        ray=refract(ray,-exitNormal,eta);
        vec3 tint=vec3(.49,.71,.70),image;
        float bent=transmitted?closestPin(pos+EPS*ray,ray,image):INF;
        if(ray.y<0. && (-halfSize.y-pos.y)/ray.y<bent) bent=INF;
        float fresnel=pow(1.-clamp(-dot(incident,normal),0.,1.),4.);
        if(bent<INF)gl_FragColor=vec4(mix(image,tint,.07),1.);
        else gl_FragColor=vec4(tint,transmitted?.12+.34*fresnel:.64);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(SLAB_WIDTH, BRICK_HEIGHT, SLAB_THICKNESS), material);
  mesh.position.y = BRICK_HEIGHT / 2;
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(mesh.geometry),
    new THREE.LineBasicMaterial({ color: 0x77938e, transparent: true, opacity: 0.7 }),
  );
  mesh.add(edges);
  const inverse = new THREE.Matrix4(),
    pinEye = new THREE.Vector3();
  for (const pin of pins)
    pin.traverse((obj) => {
      if (!obj.isMesh || obj.material.visible === false) return;
      obj.material = obj.material.clone();
      obj.material.onBeforeCompile = (shader) => {
        shader.uniforms.worldToBrick = { value: inverse };
        shader.uniforms.pinEye = { value: pinEye };
        shader.uniforms.brickHalf = { value: half };
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', '#include <common>\nuniform mat4 worldToBrick; varying vec3 pinPosition;')
          .replace(
            '#include <project_vertex>',
            '#include <project_vertex>\npinPosition=(worldToBrick*modelMatrix*vec4(transformed,1.)).xyz;',
          );
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', '#include <common>\nvarying vec3 pinPosition; uniform vec3 pinEye,brickHalf;')
          .replace(
            '#include <clipping_planes_fragment>',
            `#include <clipping_planes_fragment>
          vec3 delta=pinPosition-pinEye;
          float nearT=0.,farT=1.;
          for(int k=0;k<3;k++){
            if(abs(delta[k])<1.e-8){
              if(abs(pinEye[k])>=brickHalf[k])farT=-1.;
            }else{
              float a=(-brickHalf[k]-pinEye[k])/delta[k],b=(brickHalf[k]-pinEye[k])/delta[k];
              nearT=max(nearT,min(a,b));farT=min(farT,max(a,b));
            }
          }
          if(farT>nearT)discard;`,
          );
      };
      obj.onBeforeRender = (_renderer, _scene, camera) => {
        mesh.updateWorldMatrix(true, false);
        inverse.copy(mesh.matrixWorld).invert();
        camera.getWorldPosition(pinEye).applyMatrix4(inverse);
      };
    });
  mesh.onBeforeRender = (_renderer, _scene, camera) => {
    mesh.worldToLocal(camera.getWorldPosition(uniforms.eye.value));
    pins.forEach((pin, i) =>
      uniforms.pins.value[i].set(
        pin.position.x - mesh.position.x,
        pin.position.y - mesh.position.y,
        pin.position.z - mesh.position.z,
      ),
    );
  };
  return mesh;
}
