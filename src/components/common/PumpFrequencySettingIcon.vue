<template>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <defs>
      <filter :id="shadowId" filterUnits="objectBoundingBox" color-interpolation-filters="sRGB" x="0" y="0" width="1" height="1">
        <feFlood flood-opacity="0" result="BackgroundImageFix"/>
        <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
        <feColorMatrix in="SourceAlpha" type="matrix" result="hardAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"/>
        <feOffset dy="0" dx="0"/>
        <feGaussianBlur stdDeviation="5"/>
        <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
        <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.3 0"/>
        <feBlend mode="normal" in2="shape" result="effect1_innerShadow"/>
      </filter>
      <linearGradient :id="primaryGradientId" x1="0.243" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#C0A1FE"/>
        <stop offset="35.714%" stop-color="#0D548D"/>
        <stop offset="64.645%" stop-color="#0D548D"/>
        <stop offset="100%" stop-color="#05FCFD"/>
      </linearGradient>
      <linearGradient :id="borderGradientId" x1="0.172" y1="-0.018" x2="0.693" y2="0.787">
        <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0"/>
        <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.5"/>
      </linearGradient>
      <clipPath :id="clipId"><rect x="2" y="2" width="20" height="20"/></clipPath>
    </defs>
    <g :filter="`url(#${shadowId})`">
      <rect width="24" height="24" rx="2" :fill="`url(#${primaryGradientId})`"/>
      <rect x="0.5" y="0.5" width="23" height="23" rx="1.5" :stroke="`url(#${borderGradientId})`" fill="none"/>
    </g>
    <g :clip-path="`url(#${clipId})`">
      <path d="M10.6537504,4.8125C11.0495682,4.812520790101,11.4027271,5.06113282,11.5362501,5.43375015L14.58125,13.9137506L15.135001,11.9262505C15.248351,11.5209489,15.617899,11.24085,16.038752,11.2412505L20.75,11.2412505C21.267767,11.2412505,21.6875,11.6609836,21.6875,12.1787505C21.6875,12.6965179,21.267767,13.116251,20.75,13.116251L16.75,13.116251L15.595,17.252501C15.484862,17.645247,15.133418,17.921706999999998,14.725782,17.936266C14.318145,17.950826,13.947874,17.700139,13.81,17.316251L10.6537504,8.5250001L9.5162501,11.6912498C9.3828821,12.063437,9.0303597,12.3119521,8.6349998,12.3125L3.25,12.3125C2.73223296,12.3125,2.3125,11.8927674,2.3125,11.375C2.3125,10.8572326,2.73223296,10.4375,3.25,10.4375L7.9749999,10.4375L9.7712502,5.43375015C9.9047732,5.06113243,10.2579317,4.81252040863,10.6537504,4.8125Z" fill="#FFFFFF"/>
    </g>
  </svg>
</template>

<script setup>
import { useId } from 'vue';

const idPrefix = useId().replace(/:/g, '');
const shadowId = `${idPrefix}-pump-frequency-shadow`;
const primaryGradientId = `${idPrefix}-pump-frequency-gradient`;
const borderGradientId = `${idPrefix}-pump-frequency-border`;
const clipId = `${idPrefix}-pump-frequency-clip`;
</script>
