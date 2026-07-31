<template>
  <a-config-provider :locale="zhCN" :theme="alarmModalTheme">
    <a-modal
      :open="true"
      :width="720"
      :closable="!submitting"
      :keyboard="!submitting"
      :mask-closable="!submitting"
      :footer="null"
      centered
      wrap-class-name="alarm-handle-modal-wrap"
      @cancel="emit('close')"
    >
      <div class="alarm-modal-title">
        <div>
          <span>告警处理</span>
          <small>{{ alarm.code }}</small>
        </div>
        <a-tag :color="gradeColor">{{ alarm.level }}</a-tag>
      </div>

      <a-descriptions class="alarm-modal-details" :column="{ xs: 1, sm: 2 }" size="small" bordered>
        <a-descriptions-item label="告警设备">{{ alarm.device }}</a-descriptions-item>
        <a-descriptions-item label="设备类型">{{ alarm.deviceType }}</a-descriptions-item>
        <a-descriptions-item label="所属位置">{{ alarm.location }}</a-descriptions-item>
        <a-descriptions-item label="报警时间">{{ alarm.warnTime || alarm.time }}</a-descriptions-item>
        <a-descriptions-item label="报警类型">{{ alarm.type }}</a-descriptions-item>
        <a-descriptions-item label="处理状态">
          <span :class="['alarm-modal-status', { handled: isHandled }]">{{ alarm.handled }}</span>
        </a-descriptions-item>
      </a-descriptions>

      <section class="alarm-modal-message">
        <span>报警信息</span>
        <p>{{ alarm.message }}</p>
      </section>

      <a-alert
        v-if="isHandled"
        type="success"
        show-icon
        message="该告警已处理"
        :description="handledDescription"
      />
      <a-form v-else layout="vertical" class="alarm-handle-form" @submit.prevent="submit">
        <a-form-item label="处理说明" required :validate-status="error ? 'error' : ''" :help="error">
          <a-textarea
            v-model:value="remark"
            :maxlength="500"
            :auto-size="{ minRows: 4, maxRows: 7 }"
            show-count
            placeholder="请填写现场检查结果、处置措施和恢复情况"
            :disabled="submitting"
          />
        </a-form-item>
      </a-form>

      <AlarmAssociatedHistoryChart :alarm="alarm" />

      <div class="alarm-modal-footer">
        <div class="alarm-modal-links">
          <a-button @click="emit('locate')">定位到实时监控</a-button>
          <a-button @click="emit('view-history')">查看历史曲线</a-button>
        </div>
        <div class="alarm-modal-commands">
          <a-button :disabled="submitting" @click="emit('close')">关闭</a-button>
          <a-button v-if="!isHandled" type="primary" :loading="submitting" :disabled="!remark.trim()" @click="submit">确认处理</a-button>
        </div>
      </div>
    </a-modal>
  </a-config-provider>
</template>

<script setup>
import { computed, ref } from 'vue';
import {
  Alert as AAlert,
  Button as AButton,
  ConfigProvider as AConfigProvider,
  Descriptions as ADescriptions,
  DescriptionsItem as ADescriptionsItem,
  Form as AForm,
  FormItem as AFormItem,
  Modal as AModal,
  Tag as ATag,
  Textarea as ATextarea,
  theme as antTheme,
} from 'ant-design-vue';
import zhCN from 'ant-design-vue/es/locale/zh_CN';
import { handleAlarm } from '../../api/alarm.js';
import AlarmAssociatedHistoryChart from './AlarmAssociatedHistoryChart.vue';

const props = defineProps({ alarm: { type: Object, required: true } });
const emit = defineEmits(['close', 'handled', 'locate', 'view-history']);
const remark = ref(props.alarm.handlingRemark || '');
const submitting = ref(false);
const error = ref('');
const isHandled = computed(() => Number(props.alarm.handlingStatus) === 1);
const handledDescription = computed(() => {
  const details = [props.alarm.handlingRemark, props.alarm.handlingUser ? `处理人：${props.alarm.handlingUser}` : ''].filter(Boolean);
  return details.join('；') || '暂无处理说明';
});
const gradeColor = computed(() => ({
  fatal: 'red',
  urgent: 'volcano',
  warn: 'orange',
  notice: 'blue',
  normal: 'green',
  status: 'cyan',
}[props.alarm.grade] || 'default'));
const alarmModalTheme = {
  algorithm: antTheme.darkAlgorithm,
  token: {
    colorPrimary: '#269cff',
    colorBgBase: '#010f1e',
    colorBgContainer: '#061a2d',
    colorBorder: '#315a80',
    colorText: '#eff7ff',
    colorTextPlaceholder: '#7895b2',
    borderRadius: 5,
    controlHeight: 34,
    fontSize: 13,
  },
};

async function submit() {
  const handlingRemark = remark.value.trim();
  if (!handlingRemark || submitting.value) return;
  submitting.value = true;
  error.value = '';
  try {
    await handleAlarm({ id: props.alarm.id, handlingRemark });
    emit('handled', {
      ...props.alarm,
      handlingStatus: 1,
      handled: '已处理',
      handlingRemark,
    });
  } catch (requestError) {
    error.value = requestError?.message || '处理告警失败';
  } finally {
    submitting.value = false;
  }
}
</script>
