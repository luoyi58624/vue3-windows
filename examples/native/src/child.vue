<script setup lang="ts">
import { computed, inject, ref } from "vue";
import type { Ref } from "vue";
import { useCurrentWindow } from "../../../src";

const count = inject<Ref<number>>('count')!
const currentWindow = useCurrentWindow();
const title = ref('Window draft')
const category = ref('task')
const priority = ref('normal')
const progress = ref(35)
const enabled = ref(true)
const dueDate = ref('')
const notes = ref('Edit these controls inside and outside the window to compare native browser behavior.')

const summary = computed(() => [
  `title: ${title.value}`,
  `category: ${category.value}`,
  `priority: ${priority.value}`,
  `progress: ${progress.value}%`,
  `enabled: ${enabled.value ? 'yes' : 'no'}`,
  `due: ${dueDate.value || 'not set'}`,
])
</script>

<template>
  <article class="native-child">
    <p>
      size: {{ currentWindow.window.value.rect?.width ?? '-' }} × {{ currentWindow.window.value.rect?.height ?? '-' }}
    </p>
    <header>
      <h2>Native window content</h2>
      <p>Controls here intentionally keep browser default rendering.</p>
    </header>

    <fieldset>
      <legend>Shared state</legend>

      <p>Injected count: <strong>{{ count }}</strong></p>

      <menu>
        <button type="button" @click="count++">Increase</button>
        <button type="button" @click="count = 0">Reset</button>
      </menu>
    </fieldset>

    <fieldset>
      <legend>Form controls</legend>

      <label>
        Title
        <input v-model="title" type="text" />
      </label>

      <label>
        Category
        <select v-model="category">
          <option value="task">Task</option>
          <option value="note">Note</option>
          <option value="bug">Bug</option>
        </select>
      </label>

      <label>
        Due date
        <input v-model="dueDate" type="date" />
      </label>

      <label>
        Progress
        <input v-model.number="progress" type="range" min="0" max="100" />
        <output>{{ progress }}%</output>
      </label>

      <label>
        <input v-model="enabled" type="checkbox" />
        Enabled
      </label>

      <div class="native-child__radio-group" role="radiogroup" aria-label="Priority">
        <label>
          <input v-model="priority" type="radio" value="low" />
          Low
        </label>
        <label>
          <input v-model="priority" type="radio" value="normal" />
          Normal
        </label>
        <label>
          <input v-model="priority" type="radio" value="high" />
          High
        </label>
      </div>

      <label>
        Notes
        <textarea v-model="notes" rows="5" />
      </label>
    </fieldset>

    <details open>
      <summary>Current values</summary>
      <ul>
        <li v-for="summaryLine in summary" :key="summaryLine">{{ summaryLine }}</li>
      </ul>
    </details>
  </article>
</template>

<style scoped>
.native-child {
  display: grid;
  gap: 1rem;
}

.native-child header,
.native-child fieldset,
.native-child label,
.native-child details {
  display: grid;
  gap: 0.5rem;
}

.native-child h2,
.native-child p,
.native-child ul {
  margin-block: 0;
}

.native-child menu,
.native-child__radio-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  padding: 0;
}

.native-child input:not([type='checkbox']):not([type='radio']),
.native-child select,
.native-child textarea {
  width: 100%;
  box-sizing: border-box;
}
</style>
