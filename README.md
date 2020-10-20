# jquery-widget
对 jqueryui 官方版 widget 作了 template 集成。
## 引入
```html

<!--标签引入-->

<script src="./dist/jquery.js"></script>
<script src="./dist/jquery.widget.js"></script>
````
```javascript

// AMD引入

require(["jquery", "widget"], function(jQuery){
  ...    
});
````
## API
#### jQuery.widget.bridge();
[参考 jQuery.widget.bridge 官方版](https://api.jqueryui.com/jQuery.widget.bridge/)
#### jQuery.widget();
[参考 jQuery.widget 官方版](https://api.jqueryui.com/jQuery.widget/)
#### Base Widget 扩展
```javascript
/*
@选项

+
templates
+ 
数据类型 Object, 默认值 {}
为wigdet配置模板

@方法

+
_tmpl(name, data);
+
name: 数据类型 String，模板名称
data: 楼据类型 Any, 模板数据
使用data数据渲染名称为name的模板，返回一个jQuery对象

+
_tmplItem(elem);
+
elem: 数据类型 Dom或jQuery对象
获取elem所在的模板对象
模板对象结构：item = {
    data: {}， // 渲染模板的数据
    update(data){...} // 使用给定数据更新模板的方法
    ...
};

@模板语法

+
{value}                     文本值，html会被转码
+
{html value}                html值
+
{if value}                  条件语句开始
{else value}                带条件分支
{else}                      不带条件分支
{/if}                       条件语句结束
+
{each value}                遍历开始    
{each(i, item) value}       自定义单项变量，默认 ($key, $value)
{/each}                     遍历开始
+
{tmpl name}                 引入子模板
{tmpl(data) name}           自定义子模板数据，默认传父模板楼据
Array类型数据则每次传入单项值，循环渲染模板
+

@模板内可用变量

+
$template                   整个模板集合对像
+
$item                       当前模板对象
+
$data = $item.data          当前模板渲染数据  
模板内单纯传 key 值可省略 $data， 如 {$data.key} 可简写为 {key}, {if $data.key} 可简写为 {if key}
表达式则必须带上 $data 以免产生 undefined 错误,
如 {key+1} 最好写为 {$data.key+1}, {if key===1} 最好写为 {if $data.key===1}
+
$index = $item.index        使用Array数据时，获取当前模板数据在Array中的索引
+
$parent = $item.parenat     子板板访问父模板对象
+
$widget = $item.widget      模板所在的widget组件对象
+
$options = $item.widget.options
widget组件对象的options属性，通常组件的各种数据都存在这里
+
$key, $value                当模板内有{each}{/each}遍历时，默认生成的单项 key-value 变量
+
*/
```
#### 一个简单例子
```javascript
require(["jquery", "widget"], function($){ 
 
    $.widget("wdt.demo", {

        options: {        	
            title: "我是标题",
            content: `<p style="color: #ff0000;">我是主体内容</p>`,
            list: [
                {text: "link1", href: "/link1"},
                {text: "link2", href: "/link2"},
                {text: "link3", href: "/link3"},
            ],
            desc: {
                author: "Art Jane",
                date: "2020-10-10"
            },
        
            // Callbacks
            onComplete: null
        },
        	
        templates: {

            main: `
                <h6>这是一张卡片</h6>
                <div class="card">
                    {tmpl "header"}
                    {tmpl "body"}
                    <ul class="card-list">
                        {if $data.list&&$data.list.length}
                            {tmpl(list) "listItem"}
                        {/if}
                    </ul>
                    {if desc}
                        {tmpl "footer"}
                    {/if}                    
                </div>
            `,
            
            header: `
                <div class="card-header">
                    {title}
                </div>   
            `,
            
            body: `
                <div class="card-body">
                    {html content}
                </div>   
            `,
                
            listItem: `
                <li><a href="{href}">{$data.text + " > "}</a></li>
            `,
            
            footer: `
                <div class="card-footer">
                    {each desc}
                        <span class={$key}>{$value}</span>
                    {/each}
                </div> 
            `
        },        

        _create: function(){
            this._on({
                "click .card-list>li": "_clickLi"                
            });
        },

        _init: function(){            
            this.element.html(this._tmpl("main", this.options));
            this._trigger("onComplete");
        },
        
        _clickLi: function(event){
            let item = this._tmplItem(event.currentTarget);  
            let data = item.data;
            if(data.text === "link1"){
                console.log("link1 被点击了"); 
                item.update({text: "更新 link1", href: "/new/link1"});           
            }
        }    
    }); 
});
```
