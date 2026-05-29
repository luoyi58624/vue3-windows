<template>
  <article class="playground-window">
    <header class="playground-window__header">
      <div>
        <strong>{{ item.title }}</strong>
        <p>ID: {{ item.id }}</p>
      </div>

      <div class="playground-window__actions">
        <button type="button" @click="currentWindow.minimize">最小化</button>
        <button type="button" @click="currentWindow.maximize">最大化</button>
        <button type="button" @click="currentWindow.restore">还原</button>
        <button type="button" @click="currentWindow.hide">隐藏</button>
        <button type="button" @click="currentWindow.remove">关闭</button>
      </div>
    </header>

    <dl class="playground-window__meta">
      <div>
        <dt>状态</dt>
        <dd>{{ currentWindow.item.value.state }}</dd>
      </div>
      <div>
        <dt>外部点击</dt>
        <dd>{{ item.outsideClickBehavior }}</dd>
      </div>
      <div>
        <dt>尺寸</dt>
        <dd>{{ item.width }} × {{ item.height }}</dd>
      </div>
    </dl>

    <label class="playground-window__field">
      <span>备注</span>
      <textarea
        :value="item.note"
        rows="6"
        @input="item.note = ($event.target as HTMLTextAreaElement).value"
      />
    </label>
  </article>
</template>

<script setup lang="ts">
import { useCurrentWindow } from 'vue3-windows'

defineProps<{
  item: {
    id: string
    title: string
    note: string
    width: number
    height: number
    outsideClickBehavior: string
  }
}>()

const currentWindow = useCurrentWindow()
</script>

<style scoped>
.playground-window {
  display: grid;
  gap: 16px;
}

.playground-window__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.playground-window__header strong {
  display: block;
  color: #0f172a;
  font-size: 16px;
}

.playground-window__header p {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 12px;
}

.playground-window__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.playground-window__actions button {
  height: 30px;
  padding: 0 10px;
  border: 1px solid rgba(100, 116, 139, 0.24);
  border-radius: 6px;
  background: #fff;
  color: #334155;
  cursor: pointer;
}

.playground-window__meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 0;
}

.playground-window__meta div {
  padding: 12px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 8px;
  background: #f8fafc;
}

.playground-window__meta dt {
  margin: 0 0 4px;
  color: #64748b;
  font-size: 12px;
}

.playground-window__meta dd {
  margin: 0;
  color: #0f172a;
  font-weight: 600;
}

.playground-window__field {
  display: grid;
  gap: 8px;
}

.playground-window__field span {
  color: #475569;
  font-weight: 600;
}

.playground-window__field textarea {
  width: 100%;
  resize: vertical;
  border: 1px solid rgba(148, 163, 184, 0.45);
  border-radius: 8px;
  padding: 12px;
  color: #0f172a;
  outline: none;
}

.playground-window__field textarea:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

@media (max-width: 720px) {
  .playground-window__meta {
    grid-template-columns: 1fr;
  }
}
</style>
