// 标签跟随正在操作的器材；提示和点实物调用同一动作。
export function benchCue(tag) {
  let action;
  const cue = tag('', 'pill ticker-cue sticky', () => action?.());
  cue.el.setAttribute('role', 'button');
  cue.el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action?.();
    }
  });
  cue.show(false);
  return (obj, offset, text, next) => {
    action = next;
    cue.el.tabIndex = obj && next ? 0 : -1;
    cue.show(!!obj);
    cue.el.setAttribute('aria-hidden', String(!obj));
    cue.el.classList.toggle('below', !!offset && offset[1] < 0);
    if (obj) cue.loc(obj, ...offset).text(text);
  };
}

export function auxiliary(...controls) {
  const box = document.createElement('details');
  const title = document.createElement('summary');
  title.textContent = '辅助操作';
  box.append(title, ...controls);
  return box;
}

export function paperDesk(title) {
  const dialog = document.createElement('dialog');
  dialog.className = 'ticker-desk';
  dialog.setAttribute('aria-label', title);
  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = '放回实验台';
  close.addEventListener('click', () => dialog.close());
  dialog.append(close);
  document.body.append(dialog);
  return {
    dialog,
    open() {
      if (!dialog.open) dialog.showModal();
    },
    dispose() {
      dialog.remove();
    },
  };
}

// 取下无牵引试滑的纸带，按同一把尺画出三个等时段的原始点。
export function probePaper(onChoose) {
  const desk = paperDesk('无牵引试滑纸带');
  const heading = document.createElement('h3');
  heading.textContent = '试滑纸带';
  const canvas = document.createElement('canvas');
  canvas.className = 'probe-tape';
  canvas.width = 800;
  canvas.height = 144;
  const caption = document.createElement('p');
  caption.textContent = '每段都是 0.10 s。看点距怎样变化，再决定木板怎么调。';
  desk.dialog.append(heading, canvas, caption);
  const choices = document.createElement('div');
  choices.className = 'probe-actions';
  desk.dialog.append(choices);
  ['垫高右端', '保持高度，挂槽码', '降低右端'].forEach((name, i) => {
    const button = document.createElement('button');
    button.textContent = name;
    button.onclick = () => {
      desk.dialog.close();
      onChoose(i);
    };
    choices.append(button);
  });
  return {
    dispose: desk.dispose,
    close: () => desk.dialog.close(),
    open(marks) {
      const g = canvas.getContext('2d');
      g.clearRect(0, 0, 800, 144);
      const x = (i) => 32 + (marks[i].x / marks[15].x) * 736;
      g.fillStyle = '#384441';
      g.font = '32px sans-serif';
      g.textAlign = 'center';
      for (let i = 0; i <= 15; i++) {
        const counted = i % 5 === 0;
        g.beginPath();
        g.arc(x(i), 52, counted ? 5 : 3, 0, Math.PI * 2);
        g.fill();
      }
      for (let i = 5; i <= 15; i += 5) {
        g.fillRect(x(i - 5), 68, 1, 14);
        g.fillRect(x(i), 68, 1, 14);
        g.fillRect(x(i - 5), 80, x(i) - x(i - 5), 1);
        g.fillText(((marks[i].x - marks[i - 5].x) * 1000).toFixed(1) + ' mm', (x(i) + x(i - 5)) / 2, 116);
      }
      desk.open();
    },
  };
}
