import Docker from 'dockerode';
import { Duplex } from 'stream';

export class DockerService {
  private docker: Docker;

  constructor() {
    this.docker = new Docker({ socketPath: '/var/run/docker.sock' });
  }

  async attachContainer(containerId: string): Promise<{ stream: Duplex; container: Docker.Container }> {
    try {
      const container = this.docker.getContainer(containerId);
      const stream = await container.attach({
        stream: true,
        stdin: true,
        stdout: true,
        stderr: true,
      });

      return { stream, container };
    } catch (error) {
      console.error('Error attaching to container:', error);
      throw error;
    }
  }

  async listContainers() {
    try {
      return await this.docker.listContainers();
    } catch (error) {
      console.error('Error listing containers:', error);
      throw error;
    }
  }
} 