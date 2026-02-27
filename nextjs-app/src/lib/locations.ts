
export interface LocationData {
  code: string;
  name: string;
  states: string[];
}

export const LOCATIONS: LocationData[] = [
  {
    code: 'CN',
    name: 'China (中国)',
    states: [
      'Beijing (北京)', 'Shanghai (上海)', 'Guangdong (广东)', 'Jiangsu (江苏)', 
      'Zhejiang (浙江)', 'Sichuan (四川)', 'Hubei (湖北)', 'Fujian (福建)', 
      'Shandong (山东)', 'Henan (河南)', 'Other (其他)'
    ]
  },
  {
    code: 'US',
    name: 'United States',
    states: [
      'California', 'New York', 'Texas', 'Florida', 'Illinois', 
      'Pennsylvania', 'Ohio', 'Georgia', 'North Carolina', 'Michigan', 
      'Washington', 'Arizona', 'Other'
    ]
  },
  {
    code: 'TH',
    name: 'Thailand',
    states: [
      'Bangkok', 'Chiang Mai', 'Phuket', 'Chonburi', 'Khon Kaen', 
      'Nakhon Ratchasima', 'Songkhla', 'Other'
    ]
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    states: [
      'England', 'Scotland', 'Wales', 'Northern Ireland'
    ]
  },
  {
    code: 'DE',
    name: 'Germany',
    states: [
      'Bavaria', 'Berlin', 'Hamburg', 'Hesse', 'Saxony', 'Other'
    ]
  }
];
