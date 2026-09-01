/**
 * JSAIOS - Data-Driven Generic Browser UI Framework Types
 * Defines declarative UI node schemas for layouts and component primitives.
 */

export type UINodeType = 'container' | 'component';

export interface UILayoutProps {
  direction?: 'row' | 'column';
  wrap?: boolean;
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  gap?: number | string;
  padding?: number | string;
  flex?: string | number;
  width?: string;
  height?: string;
  fullHeight?: boolean;
  fullWidth?: boolean;
  scrollable?: boolean;
  card?: boolean;
  border?: boolean;
  className?: string;
}

export interface UINodeConfig {
  id: string;
  type: UINodeType;
  componentType: string;
  layoutProps?: UILayoutProps;
  props?: Record<string, any>;
  children?: UINodeConfig[];
}

export interface UIManifestConfig {
  version: string;
  title: string;
  theme?: 'dark' | 'light';
  root: UINodeConfig;
}
