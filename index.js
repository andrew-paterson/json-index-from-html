var fs = require('fs');
var path = require('path');
var jsdom = require('jsdom');
const { JSDOM } = jsdom;
const minimatch = require('minimatch');
var mkdirp = require('mkdirp');

function getFiles(dir, files_) {
  files_ = files_ || [];
  var files;
  try {
    files = fs.readdirSync(dir);
    for (var i in files) {
      var name = dir + '/' + files[i];
      if (fs.statSync(name).isDirectory()) {
        getFiles(name, files_);
      } else {
        files_.push(name);
      }
    }
    return files_;
  } catch (err) {
    console.log(err);
  } 
}

function removeExtraSpaces(string, whiteSpaceReplacement = ' ') {
  string = string.trim();
  string = string.replace(/\s+/g, whiteSpaceReplacement);
  return string;
}

function parseString(string) {
  if (!string) { return; }
  return removeExtraSpaces(string.replace(/&nbsp;/g, ' '));
}

function pageTitleElement(dom) {
  const headerLevels = ['h1','h2','h3','h4','h5','h6'];
  for (var headerLevel of headerLevels) {
    if (dom.querySelector(headerLevel)) {
      return dom.querySelector(headerLevel);
    }
  }
}

function processHTMLFile(filePath, opts) {
  const relativeFilePath = filePath.replace(opts.sourceDir, '');
  const href = opts.hrefFunction ? opts.hrefFunction(relativeFilePath) : relativeFilePath;

  if (opts.includeHrefs && minimatchCount(href, opts.includeHrefs).matches === 0) {
    return;
  }

  if (opts.excludeHrefs && minimatchCount(href, opts.excludeHrefs).matches > 0) {
    return;
  }

  var html = fs.readFileSync(filePath, 'utf-8');
  const dom = new JSDOM(html).window.document;
  (opts.excludeSelectors || []).forEach(excludeSelector => {
    const els = Array.from(dom.querySelectorAll(excludeSelector));
    if (els.length > 0) {
      els.forEach(el => el.remove());
    }
  });
  var bodyText = '';
  var finalArray = [];
  const headerLevels = ['h1','h2','h3','h4','h5','h6'];
  const content = {};
  opts.includeSelectors.forEach(selector => { 
    const elements = Array.from(dom.querySelectorAll(selector));
    elements.forEach(element => {
      if (!element) { return; }
      headerLevels.forEach(headerLevel => {
        const headerEls = Array.from(element.querySelectorAll(headerLevel));
        if (headerEls.length > 0) {
          content[headerLevel] = headerEls.map(header => parseString(header.textContent));
          const pageTitle = pageTitleElement(dom);
          pageTitle.remove();
        }
      });
      bodyText += element.textContent;
    });
  });
  content.body = bodyText ? parseString(bodyText) : null;
  if (!bodyText) { return;} // TODO 
  // const relativeFilePath = filePath.replace(opts.sourceDir, '');
  finalArray.push({
    href: href,
    title: (content.h1 || []).length === 1 ? content.h1[0] : (dom.querySelector('title') || {}).textContent,
    content: content
  });
  return finalArray;
}

function minimatchCount(string, patterns = []) {
  const final = {
    total: patterns.length,
    matches: 0
  }
  patterns.forEach(pattern => {
    if (minimatch(string, pattern)) {
      final.matches ++
    }
  });
  return final;
}

module.exports = function(opts) {
    const sourceDirAbsolute = path.resolve(process.cwd(), opts.sourceDir);
    const includePaths = opts.includeFilePaths || ['*.html', '**/*.html'];
    var absoluteIncludePaths = includePaths.map(includePath => {
      return path.join(sourceDirAbsolute, includePath)
    });
    var absoluteExcludePaths = (opts.excludeFilePaths || []).map(excludePath => {
      return path.join(sourceDirAbsolute, excludePath)
    });
    var filesToIndex = getFiles(opts.sourceDir).filter(filePath => {
      return minimatchCount(filePath, absoluteIncludePaths).matches > 0;
    })
    .filter(filePath => {
      return minimatchCount(filePath, absoluteExcludePaths).matches === 0;
    }).filter(item => {
      return item;
    });

    var pagesIndex = [];
    filesToIndex.forEach(filePath => {
      pagesIndex = pagesIndex.concat(processHTMLFile(filePath, opts));
    });
    pagesIndex = pagesIndex.filter(item => item);

    if (opts.includedPathsLog) {
      fs.writeFileSync(`search-index-paths-log.json`, JSON.stringify({paths: filesToIndex.map(item => item.replace(sourceDirAbsolute, ''))}, null, 2));
    }
    if (opts.includedHrefsLog) {
      const includedHrefsLog = pagesIndex.map(item => item.href);
      fs.writeFileSync(`search-index-hrefs-log.json`, JSON.stringify({paths: includedHrefsLog}, null, 2));
    }
    mkdirp.sync(path.dirname(opts.outPath));
    fs.writeFile(`${opts.outPath}`, JSON.stringify(pagesIndex, null, 2), function(err) {
      if(err) {
        return console.log(err);
      }
      console.log(`Success! ${opts.outPath} was saved`);
    });
  }


