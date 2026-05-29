# 介绍

`vue3-windows` windows 窗口管理器

## 入门示例

<ClientOnly>
  <SimpleWindowDemo />
</ClientOnly>

```vue
<script setup lang="ts">
import { globalWindow } from 'vue3-windows'
</script>

<template>
  <button type="button" @click="globalWindow.create({id: 'Demo'})">打开窗口</button>
</template>
```

## Form 表单

<ClientOnly>
  <FormWindowDemo />
</ClientOnly>

```vue
<script setup lang="ts">
import { defineComponent, ref } from 'vue'
import { globalWindow, useCurrentWindow } from 'vue3-windows'

const FormContent = defineComponent({
  setup() {
    const currentWindow = useCurrentWindow()
    const form = ref({
      name: '',
      phone: '',
      remark: '',
    })

    function cancel() {
      currentWindow.close()
    }

    function confirm() {
      currentWindow.close()
    }

    return {
      form,
      cancel,
      confirm,
    }
  },
  template: `
    <form @submit.prevent="confirm">
      <label>
        客户名称
        <input v-model="form.name" type="text" />
      </label>

      <label>
        联系电话
        <input v-model="form.phone" type="tel" />
      </label>

      <label>
        备注
        <textarea v-model="form.remark" />
      </label>

      <footer>
        <button type="button" @click="cancel">取消</button>
        <button type="submit">确认</button>
      </footer>
    </form>
  `,
})

function openForm() {
  globalWindow.create({
    id: 'form-demo',
    title: 'Form 表单',
    width: 520,
    height: 420,
    component: FormContent,
  })
}
</script>

<template>
  <button type="button" @click="openForm">打开表单窗口</button>
</template>
```

<script setup>
import FormWindowDemo from '../examples/FormWindowDemo.vue'
import SimpleWindowDemo from '../examples/SimpleWindowDemo.vue'
</script>
