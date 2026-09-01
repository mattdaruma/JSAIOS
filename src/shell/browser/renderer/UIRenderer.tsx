/**
 * JSAIOS - Generic UIRenderer Engine
 * Recursively parses declarative UINodeConfig JSON trees and renders React UI component trees.
 */

import React from 'react';
import type { UINodeConfig } from '../types';

import { Container } from '../layouts/Container';
import { Header } from '../layouts/Header';
import { SidePanel } from '../layouts/SidePanel';

import { Typography } from '../components/Typography';
import { TextBlock } from '../components/TextBlock';
import { CodeEditor } from '../components/CodeEditor';
import { Input } from '../components/Input';
import { Checkbox } from '../components/Checkbox';
import { DatePicker } from '../components/DatePicker';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';

interface UIRendererProps {
  config: UINodeConfig;
  state?: Record<string, any>;
  onEvent?: (eventName: string, payload?: any) => void;
}

export const UIRenderer: React.FC<UIRendererProps> = ({ config, state = {}, onEvent }) => {
  if (!config) return null;

  const renderChildren = () => {
    if (!config.children || config.children.length === 0) return null;
    return config.children.map((childNode) => (
      <UIRenderer key={childNode.id} config={childNode} state={state} onEvent={onEvent} />
    ));
  };

  const compType = config.componentType.toLowerCase();

  // Layout Containers
  if (compType === 'container') {
    return <Container {...config.layoutProps} {...config.props}>{renderChildren()}</Container>;
  }
  if (compType === 'header') {
    return <Header {...config.props}>{renderChildren()}</Header>;
  }
  if (compType === 'sidepanel') {
    return <SidePanel {...config.props}>{renderChildren()}</SidePanel>;
  }

  // Component Primitives
  if (compType === 'typography') {
    return <Typography {...config.props}>{config.props?.text || renderChildren()}</Typography>;
  }
  if (compType === 'textblock') {
    const dynamicContent = state[config.props?.stateKey] !== undefined ? state[config.props?.stateKey] : config.props?.content;
    return <TextBlock {...config.props} content={dynamicContent}>{renderChildren()}</TextBlock>;
  }
  if (compType === 'codeeditor') {
    const dynamicVal = state[config.props?.stateKey] !== undefined ? state[config.props?.stateKey] : config.props?.value;
    return (
      <CodeEditor
        {...config.props}
        value={dynamicVal}
        onChange={(val) => onEvent && onEvent(`${config.id}:change`, val)}
      />
    );
  }
  if (compType === 'input') {
    return (
      <Input
        {...config.props}
        onSubmit={(val) => onEvent && onEvent(`${config.id}:submit`, val)}
        onChange={(val) => onEvent && onEvent(`${config.id}:change`, val)}
      />
    );
  }
  if (compType === 'checkbox') {
    return (
      <Checkbox
        {...config.props}
        onChange={(val) => onEvent && onEvent(`${config.id}:change`, val)}
      />
    );
  }
  if (compType === 'datepicker') {
    return (
      <DatePicker
        {...config.props}
        onChange={(val) => onEvent && onEvent(`${config.id}:change`, val)}
      />
    );
  }
  if (compType === 'button') {
    return (
      <Button
        {...config.props}
        onClick={() => onEvent && onEvent(`${config.id}:click`)}
      >
        {config.props?.label || renderChildren()}
      </Button>
    );
  }
  if (compType === 'badge') {
    const dynamicLabel = state[config.props?.stateKey] !== undefined ? state[config.props?.stateKey] : config.props?.label;
    return <Badge {...config.props} label={dynamicLabel}>{renderChildren()}</Badge>;
  }
  if (compType === 'modal') {
    return <Modal {...config.props}>{renderChildren()}</Modal>;
  }

  // Fallback default container
  return <div className="p-2 border border-dashed border-zinc-800">{renderChildren()}</div>;
};
