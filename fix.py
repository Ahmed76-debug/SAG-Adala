import io,os
p=r"C:\Users\CONNECT\Documents\Default Project\adala-platform\create_guide.py"
s=open(p,encoding='utf-8').read()
old=u"['تاريخ الاستحقاق', 'تاريخ', 'يفضل', 'مهم جداً للمتابعة.'),"
new=u"['تاريخ الاستحقاق', 'تاريخ', 'يفضل', 'مهم جداً للمتابعة.'],"
if old in s:
    s=s.replace(old,new)
    open(p,'w',encoding='utf-8').write(s)
    print('fixed')
else:
    print('notfound')
    # try to show context
    for i,l in enumerate(s.splitlines()):
        if 'تاريخ الاستحقاق' in l:
            print(i,l)
            break
