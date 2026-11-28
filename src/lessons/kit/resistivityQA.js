// 器材走本课的鼠标分派，读数提交到学生使用的同一个表单。
import * as THREE from 'three';
import { SCREW_PITCH } from './micrometer.js';

export function resistivityQA({ group, camera, pointer, length, diameter, bench, switchLever, divider, ammeter, voltmeter,
  leads, readingForm, bar, results, panel }) {
  const v = (x, y, z) => new THREE.Vector3(x, y, z);
  const local = obj => group.worldToLocal(obj.getWorldPosition(new THREE.Vector3()));
  const steps = [];
  function operate(name, obj, to) {
    const mouse = { kind: to ? 'drag' : 'tap', obj, to };
    steps.push({ name, mouse, run() {
      const ray = new THREE.Raycaster();
      const aim = p => {
        const s = p.project(camera);
        ray.setFromCamera({ x: s.x, y: s.y }, camera);
        return { clientX: (s.x + 1) * innerWidth / 2, clientY: (1 - s.y) * innerHeight / 2 };
      };
      obj.geometry.computeBoundingBox();
      let event = aim(obj.localToWorld(obj.geometry.boundingBox.getCenter(new THREE.Vector3())));
      pointer.down(ray, event);
      if (to) { event = aim(group.localToWorld(to())); pointer.move(ray, event); }
      pointer.up(ray, event);
    } });
  }
  function check(name, run) { steps.push({ name, run }); }
  const assert = (ok, msg) => { if (!ok) throw Error(msg); };
  function submit(label, value) {
    assert(!readingForm.hidden && readingForm.querySelector('label').textContent.includes(label), '缺少读数栏 ' + label);
    readingForm.querySelector('input').value = value;
    readingForm.querySelector('button').click();
  }
  const dial = (name, obj, dx) => operate(name, obj, () => local(obj).add(v(typeof dx === 'function' ? dx() : dx, 0, 0)));
  const rulerTo = (name, x, z) => operate(name, length.ruler, () => v(x, length.ruler.position.y, z));
  const frameTo = (name, x, z) => operate(name, diameter.frame, () =>
    local(diameter.frame).add(v(x, diameter.home.y, z).sub(diameter.base.position)));
  const readEnd = side => check('提交' + side + '柱读数', () => submit(side, length.expected().toFixed(0)));

  // 先从台前任选测微器，再换直尺。测微器可以在读零点时退出并重新进入。
  dial('拿微调钮查零', diameter.fine, 0.04);
  check('从零点特写返回', () => {
    assert(diameter.near, '未能先选测微器');
    document.querySelector('.lb-back').click();
    assert(!diameter.near && readingForm.hidden, '退出后仍有待提交读数');
  });
  rulerTo('直尺放偏', 0, 0.14);
  check('检查直尺回位', () => assert(length.stowed, '错放后未归位'));
  rulerTo('直尺贴丝', 0, length.alignedZ);
  check('检查错读可重试', () => { submit('左', 900); assert(length.near, '误收错误读数'); });
  readEnd('左');
  check('取消右柱读数', () => { document.querySelector('.lb-back').click(); assert(!length.near && readingForm.hidden, '右柱未取消'); });
  operate('重新读两柱', length.ruler);
  readEnd('左'); readEnd('右');
  rulerTo('换一段刻度复测', 0.02, length.alignedZ);
  readEnd('左'); readEnd('右');
  rulerTo('放回直尺', 0, length.park);

  dial('空合测面查零', diameter.fine, 0.04);
  check('提交零点', () => submit('零点', 0));
  for (const [i, x] of [0.12, -0.02, -0.16].entries()) {
    dial('张开测面 ' + i, diameter.grip, -0.095);
    frameTo('尺架对准金属丝 ' + i, x, diameter.contactZ);
    dial('大旋钮靠近 ' + i, diameter.grip, () => (diameter.opening - diameter.diameter - 0.07) * 2 * Math.PI * 0.0067 / SCREW_PITCH);
    if (!i) check('粗调不能夹紧读数', () => {
      assert(!diameter.near && document.querySelector('.lb-txt').textContent.includes('换小微调钮'), '未引导换微调');
    });
    if (!i) {
      dial('继续粗调至接触', diameter.grip, 0.03);
      dial('检验顶住后直接微调', diameter.fine, 0.03);
      check('提示退开重新轻夹', () => assert(!diameter.near && document.querySelector('.lb-txt').textContent.includes('退开'), '粗调顶住后误开读数'));
      dial('大旋钮退开一点', diameter.grip, -0.008);
    }
    dial('微调至棘轮打滑 ' + i, diameter.fine, 0.03);
    check('提交直径 ' + i, () => submit('直径', 0.625));
  }
  dial('张开测面取下测微器', diameter.grip, -0.08);
  frameTo('放回测微器', diameter.home.x, diameter.home.z);
  check('确认两件量具交接', () => assert(length.stowed && diameter.parked && bar.current === 'circuit', '不能开始接线'));

  const post = id => bench.posts.find(p => p.id === id).pick;
  for (const [a, b] of leads) operate('接线 ' + a + ' → ' + b, post(a), () => local(post(b)));
  const switchKnob = switchLever.children[1];
  operate('合闸', switchKnob);
  const slide = pos => operate('调滑片 ' + pos, divider.slider.children[0], () =>
    group.worldToLocal(divider.group.localToWorld(v((pos - 0.5) * divider.L, 0.04, 0))));
  slide(0.03);
  operate('试读过低的电压电流', ammeter.dial);
  check('小偏转不能入图', () => assert(readingForm.hidden && document.querySelector('.lb-txt').textContent.includes('不足一小格'), '低偏转未提示'));
  for (const pos of [0.19, 0.43, 0.66, 0.88]) {
    slide(pos);
    operate('近看电流表', ammeter.dial);
    check('提交估读电流', () => submit('电流', ammeter.value.toFixed(3)));
    operate('近看电压表', voltmeter.dial);
    check('提交估读电压', () => submit('电压', voltmeter.value.toFixed(2)));
  }
  operate('实验结束断电', switchKnob);
  check('用本组数据计算', () => {
    const { inputs, report, points } = results();
    assert(points.length === 4 && points.some(([i]) => Math.abs(i / 0.02 - Math.round(i / 0.02)) > 0.1), '未记录格间估读值');
    inputs[0].value = '2.01';
    inputs[1].value = '1.10';
    report.querySelector('button').click();
    assert(bar.finished, '计算未完成');
  });
  check('揭开课本结论', () => {
    const el = panel();
    el.querySelectorAll('.p-tab')[2].click();
    el.querySelector('.flap-front').click();
    assert(el.querySelector('.flap.open'), '结论未揭开');
  });
  return steps;
}
