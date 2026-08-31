<template>
  <a-config-provider :theme="popoverTheme">
    <a-popover
      :open="open"
      placement="left"
      trigger="click"
      overlay-class-name="control-value-setting-popover"
      @open-change="handleOpenChange"
    >
      <template #content>
        <div class="control-value-setting-form" role="dialog" :aria-label="dialogLabel">
          <div class="control-value-setting-label">
            <span>{{ label }}</span>
            <strong>{{ formatValue(draftValue) }}</strong>
          </div>
          <a-slider
            v-model:value="draftValue"
            :min="min"
            :max="max"
            :step="step"
            :tooltip="{ formatter: formatValue }"
          />
          <a-button type="primary" block :loading="submitting" @click="confirm">确定</a-button>
        </div>
      </template>
      <slot />
    </a-popover>
  </a-config-provider>
</template>

<script setup>
import { computed, ref } from 'vue';
import {
  Button as AButton,
  ConfigProvider as AConfigProvider,
  Popover as APopover,
  Slider as ASlider,
  theme as antTheme,
} from 'ant-design-vue';

const props = defineProps({
  value: { type: Number, default: 0 },
  min: { type: Number, default: 0 },
  max: { type: Number, required: true },
  step: { type: Number, default: 1 },
  label: { type: String, required: true },
  unit: { type: String, default: '' },
  submit: { type: Function, default: null },
});

const emit = defineEmits(['confirm']);
const open = ref(false);
const submitting = ref(false);
const dialogLabel = computed(() => props.label.replace(/[：:]$/, ''));
const unitSeparator = computed(() => (props.unit && props.unit !== '%' ? ' ' : ''));

function normalizeValue(value) {
  const numericValue = Number(value);
  const fallbackValue = Number.isFinite(numericValue) ? numericValue : props.min;
  return Math.min(props.max, Math.max(props.min, fallbackValue));
}

function formatValue(value) {
  return `${value}${unitSeparator.value}${props.unit}`;
}

const draftValue = ref(normalizeValue(props.value));

function handleOpenChange(nextOpen) {
  if (submitting.value) return;
  open.value = nextOpen;
  if (nextOpen) draftValue.value = normalizeValue(props.value);
}

async function confirm() {
  if (submitting.value) return;

  const value = normalizeValue(draftValue.value);
  if (!props.submit) {
    emit('confirm', value);
    open.value = false;
    return;
  }

  submitting.value = true;
  try {
    await props.submit(value);
    open.value = false;
  } catch {
    // 提交失败时保留弹窗，由调用方展示具体错误。
  } finally {
    submitting.value = false;
  }
}

const popoverTheme = {
  algorithm: antTheme.darkAlgorithm,
  token: {
    colorPrimary: '#19c8f4',
    colorBgBase: '#031426',
    colorBgElevated: '#07243c',
    colorBorder: '#2779a9',
    colorText: '#eaf8ff',
    borderRadius: 4,
  },
};
</script>

<style scoped>
:global(.control-value-setting-popover .ant-popover-inner) {
  width: 260px;
  padding: 14px;
  border: 1px solid rgba(68, 183, 239, 0.68);
  background: rgba(4, 25, 44, 0.98);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.56), 0 0 20px rgba(21, 177, 232, 0.16);
}

:global(.control-value-setting-popover .ant-popover-arrow::before) {
  background: #07243c;
}

.control-value-setting-form {
  display: grid;
  gap: 12px;
}

.control-value-setting-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #cce8f7;
  font-size: 13px;
}

.control-value-setting-label strong {
  color: #ffd45c;
  font-size: 18px;
}

.control-value-setting-form :deep(.ant-slider) {
  margin: 2px 6px 4px;
}

.control-value-setting-form :deep(.ant-btn-primary) {
  height: 32px;
  border-color: #37c8ef;
  background: linear-gradient(180deg, #168ec4 0%, #0872a8 100%);
  box-shadow: 0 0 12px rgba(40, 190, 235, 0.24);
}
</style>
