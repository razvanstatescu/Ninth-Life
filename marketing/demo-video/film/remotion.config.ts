// Remotion CLI and Studio settings for the film. See ../05-production-guide.md, section 10.
import { Config } from '@remotion/cli/config';

// Canvas effects (@remotion/effects) and <HtmlInCanvas> need WebGL during renders.
Config.setChromiumOpenGlRenderer('angle');
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
Config.setOverwriteOutput(true);
