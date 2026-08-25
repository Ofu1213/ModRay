export interface MinecraftVersionConfig {
  version: string;
  enabled: boolean;

  fabric?: {
    loomVersion: string;
    fabricLoader: string;
    yarnMappings: string;
  };

  neoforge?: {
    neoForgeVersion: string;
  };
}

export const minecraftVersions: MinecraftVersionConfig[] = [
  {
    version: "1.20.1",
    enabled: true,

    fabric: {
      loomVersion: "1.6-SNAPSHOT",
      fabricLoader: "0.15.11",
      yarnMappings: "1.20.1+build.10",
    },

    neoforge: {
      neoForgeVersion: "47.1.106",
    },
  },

  {
    version: "1.20.2",
    enabled: false,
  },

  {
    version: "1.20.3",
    enabled: false,
  },

  {
    version: "1.20.4",
    enabled: false,
  },

  {
    version: "1.20.5",
    enabled: false,
  },

  {
    version: "1.20.6",
    enabled: false,
  },

  {
    version: "1.21",
    enabled: false,
  },

  {
    version: "1.21.1",
    enabled: false,
  },

  {
    version: "1.21.2",
    enabled: false,
  },

  {
    version: "1.21.3",
    enabled: false,
  },

  {
    version: "1.21.4",
    enabled: false,
  },

  {
    version: "1.21.5",
    enabled: false,
  },

  {
    version: "1.21.6",
    enabled: false,
  },

  {
    version: "1.21.7",
    enabled: false,
  },

  {
    version: "1.21.8",
    enabled: false,
  },

  {
    version: "1.21.9",
    enabled: false,
  },

  {
    version: "1.21.10",
    enabled: false,
  },

  {
    version: "1.21.11",
    enabled: false,
  },

  {
    version: "26.1",
    enabled: false,
  },
];