var fs = require('fs');
var path = require('path');
var jsdom = require('jsdom');
const { JSDOM } = jsdom;

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
        if (path.extname(name) === '.html') {
          files_.push(name);
        }
      }
    }
    return files_;
  } catch (err) {
    console.log(err);
  } 
}

function removeTrailingSlash(str) {
  if (str.charAt(str.length-1) === '/') {
    return str.substring(0, str.length - 1);
  }
  return str;
}

function removeLeadingSlash(str) {
  if (str.charAt(0) === '/') {
    return str.substring(1);
  }
  return str;
}

function removeLeadingandTrailingSlash(str) {
  str = removeLeadingSlash(str);
  str = removeTrailingSlash(str);
  return str;
}

function combinePaths(array) {
  return array.map(item => {
    item = removeLeadingSlash(item);
    item = removeTrailingSlash(item);
    return item;
  }).join('/');
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

function processHTMLFile(filePath, opts) {
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
  const headers = {};
  opts.includeSelectors.forEach(selector => { 
    const elements = Array.from(dom.querySelectorAll(selector));
    elements.forEach(element => {
      if (!element) { return; }
      headerLevels.forEach(headerLevel => {
        const headerEls = Array.from(element.querySelectorAll(headerLevel));
        if (headerEls.length > 0) {
          headers[headerLevel] = headerEls.map(header => parseString(header.textContent));
          headerEls.forEach(el => el.remove());
        }
      });
      bodyText += element.textContent;
    });
  });
  if (!bodyText && headers === {}) { return;}
  finalArray.push({
    href: path.dirname(filePath.replace(opts.sourceDir, '')),
    body: parseString(bodyText),
    headers: headers
  });
  return finalArray;
}

module.exports = {
  run(opts) {
    var absoluteExclueUrls = (opts.excludeUrls || []).map(excludePath => {
      return removeLeadingandTrailingSlash(combinePaths([opts.sourceDir, excludePath]));
    });
    var filesToIndex = getFiles(opts.sourceDir).filter(filePath => {
      return absoluteExclueUrls.indexOf(removeLeadingandTrailingSlash(filePath)) < 0;
    });
    
    var pagesIndex = [];
    filesToIndex.filter(item => {
      return item;
    }).forEach(filePath => {
      pagesIndex = pagesIndex.concat(processHTMLFile(filePath, opts));
    });
    var final = {searchIndex: pagesIndex};
    
    fs.writeFile(`${opts.outPath}`, JSON.stringify(final, null, 2), function(err) {
      if(err) {
        return console.log(err);
      }
      console.log(`Success! ${opts.outPath} was saved`);
    });
  }
}

