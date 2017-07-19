function SweetAppBruh() {

	var that = this;
	var Title = 'Totally Sweet.';

	this.CountTo = function(Max) {
	/*//
	@argv Int Max
	@return Void
	count from 1 to the specified number.
	//*/

		var Iter;

		if(Max < 1) {
			alert('Max must be greater than 1.');
			return;
		}

		for(Iter = 1; Iter <= Max; Iter++)
		alert(Iter + ' ah ah ah');

		return;
	}

	return;
}
