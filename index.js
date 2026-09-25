import fs from 'node:fs';
import Init from './model/init.js'
import { withPrefixSupport } from './components/Prefix.js'

if (!global.segment) {
  global.segment = (await import("oicq")).segment;
}

let ret = [];

logger.info(logger.yellow("- 正在载入 WAVES-PLUGIN"));

const files = fs
  .readdirSync('./plugins/waves-plugin/apps')
  .filter((file) => file.endsWith('.js'));

files.forEach((file) => {
  ret.push(import(`./apps/${file}`))
})

ret = await Promise.allSettled(ret);

let apps = {};

for (let i in files) {
  let name = files[i].replace('.js', '');

  if (ret[i].status !== 'fulfilled') {
    logger.error(`载入插件错误：${logger.red(name)}`);
    logger.error(ret[i].reason);
    continue;
  }
  // 包装插件类，使所有指令前缀（鸣潮/~/～）是否必填由 config.require_prefix 控制
  apps[name] = withPrefixSupport(ret[i].value[Object.keys(ret[i].value)[0]]);
}

logger.info(logger.green("- WAVES-PLUGIN 载入成功"));
logger.info(logger.magenta(`- 欢迎加入新组织【貓娘樂園🍥🏳️‍⚧️】（群号 707331865）`));

export { apps };