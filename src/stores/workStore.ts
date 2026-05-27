import { create } from 'zustand'
import type { VideoParseResult, PageParseResult, PlayInfo, VideoFormat } from '../types'

interface WorkState {
  // Input
  urlValue: string
  urlInvalid: boolean
  setUrlValue: (val: string) => void
  setUrlInvalid: (val: boolean) => void

  // Video info
  videoData: VideoParseResult
  mode: 'video' | 'season' | 'hide'
  setVideoData: (data: VideoParseResult) => void
  setMode: (mode: 'video' | 'season' | 'hide') => void

  // Section tabs
  sectionActiveIndex: number
  setSectionActiveIndex: (idx: number) => void

  // Loading states
  btnLoading: boolean
  initLoading: boolean
  setBtnLoading: (val: boolean) => void
  setInitLoading: (val: boolean) => void

  // Parse modal
  allPlayInfo: PlayInfoItem[]
  finishCount: number
  downloadBtnDisabled: boolean
  downloadType: 'audio' | 'video' | 'merge'
  preferredCodec: 12 | 7 | 13
  preferHiResAudio: boolean
  errorList: string[]
  totalCount: number

  setAllPlayInfo: (info: PlayInfoItem[]) => void
  addPlayInfo: (info: PlayInfoItem) => void
  setFinishCount: (n: number) => void
  setDownloadBtnDisabled: (val: boolean) => void
  setDownloadType: (t: 'audio' | 'video' | 'merge') => void
  setPreferredCodec: (c: 12 | 7 | 13) => void
  setPreferHiResAudio: (val: boolean) => void
  addError: (err: string) => void
  clearErrors: () => void
  resetModal: () => void

  // Toggle item selection
  togglePageSelection: (index: number) => void
  selectAllPages: (val: boolean) => void
  togglePlayInfoSelection: (index: number) => void
  selectAllPlayInfo: (val: boolean) => void
  setTotalCount: (n: number) => void

  // Section-aware selection (for multi-section videos)
  toggleSectionPage: (sectionIndex: number, pageIndex: number) => void
  selectAllSectionPages: (sectionIndex: number, val: boolean) => void
}

export interface AudioOption {
  url: string
  label: string
  codec?: string
}

export interface PlayInfoItem {
  page: PageParseResult
  info: PlayInfo | null
  selected: boolean
  formatIndex: number
  audioIndex: number
  audioOptions: AudioOption[]
}

const initialVideoData: VideoParseResult = {
  title: '',
  description: '',
  cover: '',
  publishData: '',
  duration: 0,
  pages: [],
  section: [],
  owner: { mid: 0, name: '', face: '' },
  dimension: { width: 0, height: 0, rotate: 0 },
  staff: [],
  status: '',
  areas: [],
  styles: [],
  targetURL: '',
}

export const useWorkStore = create<WorkState>((set, get) => ({
  urlValue: '',
  urlInvalid: false,
  setUrlValue: (val) => set({ urlValue: val }),
  setUrlInvalid: (val) => set({ urlInvalid: val }),

  videoData: { ...initialVideoData },
  mode: 'hide',
  setVideoData: (data) => set({ videoData: data }),
  setMode: (mode) => set({ mode }),

  sectionActiveIndex: 0,
  setSectionActiveIndex: (idx) => set({ sectionActiveIndex: idx }),

  btnLoading: false,
  initLoading: true,
  setBtnLoading: (val) => set({ btnLoading: val }),
  setInitLoading: (val) => set({ initLoading: val }),

  allPlayInfo: [],
  finishCount: 0,
  totalCount: 0,
  downloadBtnDisabled: false,
  downloadType: 'merge',
  preferredCodec: 12,
  preferHiResAudio: true,
  errorList: [],

  setAllPlayInfo: (info) => set({ allPlayInfo: info }),
  addPlayInfo: (info) => set((s) => ({ allPlayInfo: [...s.allPlayInfo, info] })),
  setFinishCount: (n) => set({ finishCount: n }),
  setTotalCount: (n) => set({ totalCount: n }),
  setDownloadBtnDisabled: (val) => set({ downloadBtnDisabled: val }),
  setDownloadType: (t) => set({ downloadType: t }),
  setPreferredCodec: (c) => set({ preferredCodec: c }),
  setPreferHiResAudio: (val) => set({ preferHiResAudio: val }),
  addError: (err) => set((s) => ({ errorList: [...s.errorList, err] })),
  clearErrors: () => set({ errorList: [] }),
  resetModal: () => set({
    allPlayInfo: [],
    finishCount: 0,
    totalCount: 0,
    downloadBtnDisabled: false,
    errorList: [],
  }),

  togglePageSelection: (index) => set((s) => {
    const pages = [...s.videoData.pages]
    if (pages[index]) {
      pages[index] = { ...pages[index], selected: !pages[index].selected }
    }
    return { videoData: { ...s.videoData, pages } }
  }),

  selectAllPages: (val) => set((s) => ({
    videoData: {
      ...s.videoData,
      pages: s.videoData.pages.map((p) => ({ ...p, selected: val })),
    },
  })),

  togglePlayInfoSelection: (index) => set((s) => {
    const items = [...s.allPlayInfo]
    if (items[index]) {
      items[index] = { ...items[index], selected: !items[index].selected }
    }
    return { allPlayInfo: items }
  }),

  selectAllPlayInfo: (val) => set((s) => ({
    allPlayInfo: s.allPlayInfo.map((p) => ({ ...p, selected: val })),
  })),

  toggleSectionPage: (sectionIndex, pageIndex) => set((s) => {
    const section = [...s.videoData.section]
    if (section[sectionIndex]) {
      const pages = [...section[sectionIndex].pages]
      if (pages[pageIndex]) {
        pages[pageIndex] = { ...pages[pageIndex], selected: !pages[pageIndex].selected }
      }
      section[sectionIndex] = { ...section[sectionIndex], pages }
    }
    return { videoData: { ...s.videoData, section } }
  }),

  selectAllSectionPages: (sectionIndex, val) => set((s) => {
    const section = [...s.videoData.section]
    if (section[sectionIndex]) {
      section[sectionIndex] = {
        ...section[sectionIndex],
        pages: section[sectionIndex].pages.map((p) => ({ ...p, selected: val })),
      }
    }
    return { videoData: { ...s.videoData, section } }
  }),
}))
