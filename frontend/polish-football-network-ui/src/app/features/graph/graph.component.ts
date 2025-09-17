import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GraphViewerComponent } from './graph-viewer.component';
import { GraphService } from '../../core/services/graph.service';
import { NotificationService } from '../../core/services/notification.service';
import { GraphEvents, GraphNode } from '../../shared/models/graph.model';
import { GraphEdge } from '../../shared/models/connection.model';

/// <summary>
/// Main graph component that hosts the interactive football club network visualization.
/// Provides event handlers and coordinates between the graph viewer and other application services.
/// </summary>
@Component({
  selector: 'app-graph',
  standalone: true,
  imports: [CommonModule, GraphViewerComponent],
  template: `
    <app-graph-viewer
      [graphEvents]="graphEvents"
      (nodeSelected)="onNodeSelected($event)"
      (edgeSelected)="onEdgeSelected($event)"
      (selectionCleared)="onSelectionCleared()">
    </app-graph-viewer>
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
      overflow: hidden;
    }
  `]
})
export class GraphComponent {
  private readonly graphService = inject(GraphService);
  private readonly notificationService = inject(NotificationService);

  /// <summary>
  /// Graph event handlers configuration for the viewer component.
  /// </summary>
  public readonly graphEvents: GraphEvents = {
    onNodeClick: (node: GraphNode, event: Event) => {
      console.log('Node clicked:', node);
      this.handleNodeInteraction(node, 'click');
    },

    onNodeDoubleClick: (node: GraphNode, event: Event) => {
      console.log('Node double-clicked:', node);
      this.handleNodeInteraction(node, 'double-click');
      this.showNodeDetails(node);
    },

    onNodeHover: (node: GraphNode, event: Event) => {
      // Show quick info tooltip or highlight connected nodes
      this.highlightConnectedNodes(node);
    },

    onNodeSelect: (nodes: GraphNode[]) => {
      console.log('Nodes selected:', nodes);
      if (nodes.length > 0) {
        this.notificationService.showInfo(`Selected ${nodes.length} club(s)`);
      }
    },

    onEdgeClick: (edge: GraphEdge, event: Event) => {
      console.log('Edge clicked:', edge);
      this.handleEdgeInteraction(edge);
    },

    onEdgeHover: (edge: GraphEdge, event: Event) => {
      // Show connection details
      this.showConnectionPreview(edge);
    },

    onBackgroundClick: (event: Event) => {
      console.log('Background clicked');
      // Clear any active selections or reset view
    },

    onZoom: (level: number) => {
      console.log('Zoom level changed:', level);
      // Update UI elements based on zoom level
    },

    onPan: (position: { x: number; y: number }) => {
      // Handle pan events if needed
    },

    onLayoutComplete: () => {
      console.log('Layout calculation completed');
      this.notificationService.showSuccess('Graph layout updated');
    }
  };

  /// <summary>
  /// Handles node selection events from the graph viewer.
  /// </summary>
  /// <param name="node">Selected graph node</param>
  public onNodeSelected(node: GraphNode): void {
    console.log('Graph component received node selection:', node);

    // Show success message with club info
    this.notificationService.showInfo(
      `Selected ${node.data.name} from ${node.data.city}`
    );

    // Update any related components or services
    this.updateRelatedViews(node);
  }

  /// <summary>
  /// Handles edge selection events from the graph viewer.
  /// </summary>
  /// <param name="edge">Selected graph edge</param>
  public onEdgeSelected(edge: GraphEdge): void {
    console.log('Graph component received edge selection:', edge);

    // Show connection information
    this.notificationService.showInfo(
      `Connection: ${edge.type} (${edge.strength})`
    );
  }

  /// <summary>
  /// Handles selection cleared events from the graph viewer.
  /// </summary>
  public onSelectionCleared(): void {
    console.log('Graph component received selection cleared');

    // Clear related views or reset state
    this.clearRelatedViews();
  }

  /// <summary>
  /// Handles various node interaction types.
  /// </summary>
  /// <param name="node">Interacted node</param>
  /// <param name="interactionType">Type of interaction</param>
  private handleNodeInteraction(node: GraphNode, interactionType: string): void {
    switch (interactionType) {
      case 'click':
        // Standard click handling - already handled by selection
        break;

      case 'double-click':
        // Navigate to club details or open modal
        this.navigateToClubDetails(node);
        break;

      default:
        console.log(`Unknown interaction type: ${interactionType}`);
    }
  }

  /// <summary>
  /// Handles edge interaction events.
  /// </summary>
  /// <param name="edge">Interacted edge</param>
  private handleEdgeInteraction(edge: GraphEdge): void {
    // Show detailed connection information
    this.showConnectionDetails(edge);
  }

  /// <summary>
  /// Highlights nodes connected to the specified node.
  /// </summary>
  /// <param name="node">Node to find connections for</param>
  private highlightConnectedNodes(node: GraphNode): void {
    // This could trigger visual highlighting in the graph viewer
    // or update a connections panel showing related clubs
    console.log(`Highlighting connections for: ${node.data.name}`);
  }

  /// <summary>
  /// Shows detailed information about a node.
  /// </summary>
  /// <param name="node">Node to show details for</param>
  private showNodeDetails(node: GraphNode): void {
    // This could open a detailed modal or navigate to a club page
    console.log(`Showing details for: ${node.data.name}`);

    this.notificationService.showInfo(
      `Club Details: ${node.data.name} - Founded ${node.data.foundedYear}`
    );
  }

  /// <summary>
  /// Shows a preview of connection information.
  /// </summary>
  /// <param name="edge">Edge to show preview for</param>
  private showConnectionPreview(edge: GraphEdge): void {
    console.log(`Connection preview: ${edge.type} - ${edge.strength}`);
  }

  /// <summary>
  /// Shows detailed connection information.
  /// </summary>
  /// <param name="edge">Edge to show details for</param>
  private showConnectionDetails(edge: GraphEdge): void {
    console.log(`Connection details: ${edge.id}`);

    this.notificationService.showInfo(
      `Connection: ${edge.type} relationship (${edge.strength} strength)`
    );
  }

  /// <summary>
  /// Navigates to club details page or opens club modal.
  /// </summary>
  /// <param name="node">Node representing the club</param>
  private navigateToClubDetails(node: GraphNode): void {
    // Navigate to club details route
    console.log(`Navigating to club details: ${node.data.id}`);

    // This could use Angular Router to navigate to /clubs/:id
    // For now, just show a notification
    this.notificationService.showInfo(
      `Opening details for ${node.data.name}`
    );
  }

  /// <summary>
  /// Updates related views when a node is selected.
  /// </summary>
  /// <param name="node">Selected node</param>
  private updateRelatedViews(node: GraphNode): void {
    // Update any dashboard panels, statistics, or related components
    console.log(`Updating related views for: ${node.data.name}`);
  }

  /// <summary>
  /// Clears related views when selection is cleared.
  /// </summary>
  private clearRelatedViews(): void {
    // Clear any dashboard panels or reset related components
    console.log('Clearing related views');
  }
}
