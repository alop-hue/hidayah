import Svg, { Circle, Path } from 'react-native-svg';

export type DockIconName = 'home' | 'quran' | 'qibla' | 'dhikr' | 'settings';

interface Props {
  name: DockIconName;
  color: string;
  size?: number;
  active?: boolean;
}

/**
 * Custom line icons drawn to match the Hidayah reference exactly:
 * thin 1.7px strokes, rounded joins, optical 24px grid.
 */
export function DockIcon({ name, color, size = 22, active }: Props) {
  const common = {
    stroke: color,
    strokeWidth: active ? 2 : 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'home' ? (
        <>
          <Path d="M4.2 10.8 12 4.3l7.8 6.5v7.6a1.7 1.7 0 0 1-1.7 1.7h-3.7v-5.3H9.6v5.3H5.9a1.7 1.7 0 0 1-1.7-1.7z" {...common} />
        </>
      ) : null}

      {name === 'quran' ? (
        <>
          <Path d="M4.2 5.6c2.6-1.4 5.2-1.4 7.8 0 2.6-1.4 5.2-1.4 7.8 0v12.6c-2.6-1.4-5.2-1.4-7.8 0-2.6-1.4-5.2-1.4-7.8 0z" {...common} />
          <Path d="M12 5.6v12.6" {...common} strokeWidth={1.3} />
        </>
      ) : null}

      {name === 'qibla' ? (
        <Path
          d="M12 3.6 20 20.4l-8-3.6-8 3.6z"
          fill={active ? color : 'none'}
          stroke={color}
          strokeWidth={active ? 1.6 : 1.7}
          strokeLinejoin="round"
        />
      ) : null}

      {name === 'dhikr' ? (
        <>
          <Circle cx="12" cy="12" r={active ? 2.5 : 2.3} fill={color} />
          <Circle cx="12" cy="5.6" r="1.8" fill={color} />
          <Circle cx="18.1" cy="9.8" r="1.8" fill={color} />
          <Circle cx="15.8" cy="17.6" r="1.8" fill={color} />
          <Circle cx="8.2" cy="17.6" r="1.8" fill={color} />
          <Circle cx="5.9" cy="9.8" r="1.8" fill={color} />
        </>
      ) : null}

      {name === 'settings' ? (
        <>
          <Circle cx="12" cy="12" r="3.2" {...common} />
          <Path
            d="M19.1 14.6c.1.3.2.6.2.9l1.1 1.5-1.6 2.7-1.8-.6c-.5.4-1 .6-1.6.8l-.3 1.9h-3.2l-.3-1.9c-.6-.2-1.1-.4-1.6-.8l-1.8.6-1.6-2.7 1.1-1.5c0-.3.1-.6.2-.9l-1.2-1.5 1.6-2.7 1.8.6c.5-.4 1-.6 1.6-.8l.3-1.9h3.2l.3 1.9c.6.2 1.1.4 1.6.8l1.8-.6 1.6 2.7-1.2 1.5z"
            {...common}
            strokeWidth={1.5}
          />
        </>
      ) : null}
    </Svg>
  );
}
