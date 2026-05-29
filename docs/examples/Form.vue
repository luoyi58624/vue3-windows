<template>
  <form class="form-window" @submit.prevent="confirm">
    <label class="form-window__field">
      <span>客户名称</span>
      <input v-model="form.name" type="text" placeholder="请输入客户名称"/>
    </label>

    <label class="form-window__field">
      <span>联系电话</span>
      <input v-model="form.phone" type="tel" placeholder="请输入联系电话"/>
    </label>

    <label class="form-window__field">
      <span>备注</span>
      <textarea v-model="form.remark" rows="4" placeholder="请输入备注"/>
    </label>

    <div class="form-window__footer">
      <button type="button" class="form-window__button" @click="currentWindow.close()">取消</button>
      <button type="submit" class="form-window__button form-window__button--primary" @click="currentWindow.close()">
        确认
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useCurrentWindow } from "vue3-windows";

const currentWindow = useCurrentWindow()

const form = ref({
  name: '',
  phone: '',
  remark: '',
})

</script>


<style scoped>

:global(.form-window) {
  display: flex;
  flex-direction: column;
  gap: 14px;
  height: 100%;
  padding: 18px;
}

:global(.form-window__field) {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: #334155;
  font-size: 14px;
}

:global(.form-window__field span) {
  font-weight: 600;
}

:global(.form-window__field input),
:global(.form-window__field textarea) {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid rgba(148, 163, 184, 0.42);
  border-radius: 6px;
  background: #fff;
  color: #0f172a;
  font: inherit;
}

:global(.form-window__field input) {
  height: 34px;
  padding: 0 10px;
}

:global(.form-window__field textarea) {
  resize: none;
  padding: 9px 10px;
}

:global(.form-window__footer) {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: auto;
  padding-top: 14px;
  border-top: 1px solid rgba(148, 163, 184, 0.2);
}

:global(.form-window__button) {
  height: 34px;
  min-width: 72px;
  padding: 0 14px;
  border: 1px solid rgba(148, 163, 184, 0.44);
  border-radius: 6px;
  background: #fff;
  color: #334155;
  cursor: pointer;
}

:global(.form-window__button--primary) {
  border-color: #2563eb;
  background: #2563eb;
  color: #fff;
}
</style>
