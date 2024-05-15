# Slurm Frontend

This package provides a React-based Frontend to visualize SLURM-based data.

The SLURM data itself is queried from [slurmrestd](https://slurm.schedmd.com/slurmrestd.html) using INETD mode.
The python package [slurm-monitor](https://github.com/2maz/slurm-monitor) permits to start a endpoint that exposes a REST-interface to provide public access to the SLURM data.

## Installation

Install nvm and latest npm following the [instructions](https://github.com/nvm-sh/nvm), e.g.,

```
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    nvm install node # where "node" is an alias for the latest version
```

After cloning this package install all packages:

```
    npm i
```

Try to run the ui in development mode:

```
    npm run dev
```

![nodes](./docs/images/view-nodes.png "Nodes View")



# License

Copyright (c) 2024 Thomas Roehr, Simula Research Laboratory

This project is licensed under the terms of the [New BSD License](https://opensource.org/license/BSD-3-clause).
You are free to use, modify, and distribute this work, subject to the
conditions specified in the LICENSE file.
